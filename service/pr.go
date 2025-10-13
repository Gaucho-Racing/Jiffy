package service

import (
	"errors"
	"jiffy/database"
	"jiffy/model"
	"jiffy/utils"

	"gorm.io/gorm"
)

func GetAllPurchaseRequests() []model.PurchaseRequest {
	var prs []model.PurchaseRequest
	if err := database.DB.Preload("Items").Preload("Approvals").Order("created_at DESC").Find(&prs).Error; err != nil {
		utils.SugarLogger.Errorf("Error getting purchase requests: %v", err)
		return nil
	}
	for i := range prs {
		prs[i].User, _ = GetUser(prs[i].UserID)
	}
	return prs
}

func GetPurchaseRequestByID(id int) model.PurchaseRequest {
	var pr model.PurchaseRequest
	if err := database.DB.Preload("Items").Preload("Approvals", func(db *gorm.DB) *gorm.DB {
		return db.Order("id ASC")
	}).First(&pr, "id = ?", id).Error; err != nil {
		utils.SugarLogger.Errorf("Error getting purchase request with id %s: %v", id, err)
		return model.PurchaseRequest{}
	}
	pr.User, _ = GetUser(pr.UserID)
	for i := range pr.Approvals {
		if pr.Approvals[i].UserID != "" {
			pr.Approvals[i].User, _ = GetUser(pr.Approvals[i].UserID)
		}
	}
	return pr
}

func CreatePurchaseRequest(pr model.PurchaseRequest, userID string) (model.PurchaseRequest, error) {
	isNew := pr.ID == 0

	if isNew {
		pr.UserID = userID
	} else {
		existingPR := GetPurchaseRequestByID(pr.ID)
		if existingPR.ID == 0 {
			return model.PurchaseRequest{}, errors.New("purchase request not found")
		}
		if existingPR.UserID != userID {
			return model.PurchaseRequest{}, errors.New("you can only edit your own purchase requests")
		}
		if existingPR.Status != model.PurchaseRequestPending && existingPR.Status != model.PurchaseRequestRejected {
			return model.PurchaseRequest{}, errors.New("can only edit purchase requests with pending or rejected status")
		}
	}
	pr.Status = model.PurchaseRequestPending
	pr.EstimatedCostCents = calculateEstimatedCost(pr.Items) + pr.ShippingTaxCostCents
	if len(pr.Items) > 0 {
		if !isNew {
			if err := DeletePurchaseRequestItems(pr.ID); err != nil {
				return model.PurchaseRequest{}, err
			}
		}
		itemsToCreate := pr.Items
		pr.Items = nil
		if isNew {
			utils.SugarLogger.Infoln("Creating new PR")
			if result := database.DB.Create(&pr); result.Error != nil {
				return model.PurchaseRequest{}, result.Error
			}
		} else {
			utils.SugarLogger.Infof("Updating existing PR %d", pr.ID)
			if err := database.DB.Model(&model.PurchaseRequest{}).Where("id = ?", pr.ID).Updates(pr).Error; err != nil {
				utils.SugarLogger.Errorf("Error updating PR %d: %v", pr.ID, err)
				return model.PurchaseRequest{}, err
			}
		}
		pr.Items = itemsToCreate
		for i, item := range pr.Items {
			newItem := model.PurchaseRequestItem{
				PurchaseRequestID:  pr.ID,
				ItemURL:            item.ItemURL,
				ItemName:           item.ItemName,
				ItemUnitPriceCents: item.ItemUnitPriceCents,
				ItemQuantity:       item.ItemQuantity,
			}
			utils.SugarLogger.Infof("Creating item %d: Name=%s, Price=%d, Qty=%d", i, newItem.ItemName, newItem.ItemUnitPriceCents, newItem.ItemQuantity)
			if err := CreatePurchaseRequestItem(newItem); err != nil {
				utils.SugarLogger.Errorf("Error creating item %d: %v", i, err)
				return model.PurchaseRequest{}, err
			}
		}
		utils.SugarLogger.Infof("Created %d items for PR %d", len(pr.Items), pr.ID)
	} else {
		return model.PurchaseRequest{}, errors.New("you must provide at least one item")
	}
	if err := CreateInitialApprovals(pr.ID); err != nil {
		utils.SugarLogger.Errorf("Error creating initial approvals for PR %s: %v", pr.ID, err)
		return model.PurchaseRequest{}, err
	}
	pr = GetPurchaseRequestByID(pr.ID)
	utils.SugarLogger.Infof("Successfully created PR %d", pr.ID)
	return pr, nil
}

func UpdatePurchaseRequestStatus(prID int, newStatus model.PurchaseRequestStatus, userID string) (model.PurchaseRequest, error) {
	existingPR := GetPurchaseRequestByID(prID)
	if existingPR.ID == 0 {
		return model.PurchaseRequest{}, errors.New("purchase request not found")
	}

	user, err := GetUser(userID)
	if err != nil {
		return model.PurchaseRequest{}, errors.New("user not found")
	}
	if !user.IsInnerCircle() {
		return model.PurchaseRequest{}, errors.New("only inner circle members can edit status")
	}

	// Validate status transition
	switch existingPR.Status {
	case model.PurchaseRequestPending:
		if newStatus != model.PurchaseRequestApproved && newStatus != model.PurchaseRequestRejected {
			return model.PurchaseRequest{}, errors.New("invalid status change")
		}
	case model.PurchaseRequestApproved:
		if newStatus != model.PurchaseRequestOrdered {
			return model.PurchaseRequest{}, errors.New("invalid status change")
		}
	case model.PurchaseRequestRejected:
		if newStatus != model.PurchaseRequestPending {
			return model.PurchaseRequest{}, errors.New("invalid status change")
		}
	case model.PurchaseRequestOrdered:
		if newStatus != model.PurchaseRequestDelivered {
			return model.PurchaseRequest{}, errors.New("invalid status change")
		}
	case model.PurchaseRequestDelivered:
		if newStatus != model.PurchaseRequestCollected {
			return model.PurchaseRequest{}, errors.New("invalid status change")
		}
	default:
		return model.PurchaseRequest{}, errors.New("invalid status change")
	}
	if err := database.DB.Model(&model.PurchaseRequest{}).Where("id = ?", prID).Update("status", newStatus).Error; err != nil {
		return model.PurchaseRequest{}, err
	}
	return GetPurchaseRequestByID(prID), nil
}

func DeletePurchaseRequest(prID int) error {
	if err := DeleteAllApprovals(prID); err != nil {
		utils.SugarLogger.Errorf("Error deleting approvals for PR %d: %v", prID, err)
		return err
	}
	if err := database.DB.Where("purchase_request_id = ?", prID).Delete(&model.PurchaseRequestItem{}).Error; err != nil {
		utils.SugarLogger.Errorf("Error deleting items for PR %d: %v", prID, err)
		return err
	}
	if err := database.DB.Delete(&model.PurchaseRequest{}, prID).Error; err != nil {
		utils.SugarLogger.Errorf("Error deleting PR %d: %v", prID, err)
		return err
	}
	utils.SugarLogger.Infof("Successfully deleted PR %d and all related data", prID)
	return nil
}
