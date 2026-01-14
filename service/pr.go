package service

import (
	"errors"
	"fmt"
	"jiffy/database"
	"jiffy/model"
	"jiffy/utils"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

func GetAllPurchaseRequests() []model.PurchaseRequest {
	var prs []model.PurchaseRequest
	if err := database.DB.Preload("Items").Preload("Approvals").Preload("Notes").Order("created_at DESC").Find(&prs).Error; err != nil {
		utils.SugarLogger.Errorf("Error getting purchase requests: %v", err)
		return nil
	}
	for i := range prs {
		prs[i].User, _ = GetUser(prs[i].UserID)
	}
	return prs
}

func GetPurchaseRequestByID(id int, userID string) model.PurchaseRequest {
	var pr model.PurchaseRequest
	if err := database.DB.Preload("Items").Preload("Approvals", func(db *gorm.DB) *gorm.DB {
		return db.Order("id ASC")
	}).Preload("Notes", func(db *gorm.DB) *gorm.DB {
		return db.Order("created_at DESC")
	}).Preload("Attachments", func(db *gorm.DB) *gorm.DB {
		return db.Order("created_at DESC")
	}).First(&pr, "id = ?", id).Error; err != nil {
		utils.SugarLogger.Errorf("Error getting purchase request with id %s: %v", id, err)
		return model.PurchaseRequest{}
	}

	pr.User, _ = GetUser(pr.UserID)
	for i := range pr.Approvals {
		if pr.Approvals[i].UserID != "" {
			pr.Approvals[i].User, _ = GetUser(pr.Approvals[i].UserID)
		}
		pr.Approvals[i].ApproverGroup, _ = GetApproverGroup(pr.Approvals[i].ApproverGroupID)
	}
	for i := range pr.Notes {
		pr.Notes[i].User, _ = GetUser(pr.Notes[i].UserID)
	}
	for i := range pr.Attachments {
		pr.Attachments[i].User, _ = GetUser(pr.Attachments[i].UserID)
	}
	currentUser, _ := GetUser(userID)
	if pr.UserID != userID && !currentUser.IsInnerCircle() {
		pr.ShippingAddressID = ""
		pr.ShippingAddress = model.ShippingAddress{} // hide address
		return pr
	}
	if pr.ShippingAddressID != "" {
		if address, err := GetShippingAddressByID(pr.ShippingAddressID); err == nil {
			pr.ShippingAddress = address
		}
	}
	return pr
}

func CreatePurchaseRequest(pr model.PurchaseRequest, userID string) (model.PurchaseRequest, error) {
	isNew := pr.ID == 0

	var existingPR model.PurchaseRequest
	if isNew {
		pr.UserID = userID
	} else {
		existingPR = GetPurchaseRequestByID(pr.ID, userID)
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
			_, _ = CreateNote(pr.ID, model.NoteRequestSubmitted, userID, "Purchase request submitted - awaiting approval.")
		} else {
			utils.SugarLogger.Infof("Updating existing PR %d", pr.ID)
			// update fields that can be edited to 0, which would be otherwise skipped
			if pr.ShippingAddressID == "" && existingPR.ShippingAddressID != "" {
				if err := database.DB.Model(&model.PurchaseRequest{}).Where("id = ?", pr.ID).Update("shipping_address_id", "").Error; err != nil {
					utils.SugarLogger.Errorf("Error updating shipping address for PR %d: %v", pr.ID, err)
					return model.PurchaseRequest{}, err
				}
			}
			if pr.ShippingTaxCostCents == 0 && existingPR.ShippingTaxCostCents != 0 {
				if err := database.DB.Model(&model.PurchaseRequest{}).Where("id = ?", pr.ID).Update("shipping_tax_cost_cents", 0).Error; err != nil {
					utils.SugarLogger.Errorf("Error updating shipping/tax cost for PR %d: %v", pr.ID, err)
					return model.PurchaseRequest{}, err
				}
			}
			if !pr.PlacedOrderUnapproved && existingPR.PlacedOrderUnapproved {
				if err := database.DB.Model(&model.PurchaseRequest{}).Where("id = ?", pr.ID).Update("placed_order_unapproved", false).Error; err != nil {
					utils.SugarLogger.Errorf("Error updating placed_order_unapproved for PR %d: %v", pr.ID, err)
					return model.PurchaseRequest{}, err
				}
			}

			if err := database.DB.Model(&model.PurchaseRequest{}).Where("id = ?", pr.ID).Updates(pr).Error; err != nil {
				utils.SugarLogger.Errorf("Error updating PR %d: %v", pr.ID, err)
				return model.PurchaseRequest{}, err
			}
			_, _ = CreateNote(pr.ID, model.NoteRequestAmended, userID, "Purchase request amended and approvals reset - awaiting approval.")

		}
		pr.Items = itemsToCreate
		for i, item := range pr.Items {
			newItem := model.PurchaseRequestItem{
				ID:                uuid.New().String(),
				PurchaseRequestID: pr.ID,
				URL:               item.URL,
				Name:              item.Name,
				UnitPriceCents:    item.UnitPriceCents,
				Quantity:          item.Quantity,
			}
			utils.SugarLogger.Infof("Creating item %d: Name=%s, Price=%d, Qty=%d", i, newItem.Name, newItem.UnitPriceCents, newItem.Quantity)
			if err := CreatePurchaseRequestItem(newItem); err != nil {
				utils.SugarLogger.Errorf("Error creating item %d: %v", i, err)
				return model.PurchaseRequest{}, err
			}
		}
		utils.SugarLogger.Infof("Created %d items for PR %d", len(pr.Items), pr.ID)
	} else {
		return model.PurchaseRequest{}, errors.New("you must provide at least one item")
	}
	initialApprovals, err := CreateInitialApprovals(pr.ID)
	if err != nil {
		utils.SugarLogger.Errorf("Error creating initial approvals for PR %s: %v", pr.ID, err)
		return model.PurchaseRequest{}, err
	}
	pr = GetPurchaseRequestByID(pr.ID, userID)
	utils.SugarLogger.Infof("Successfully created PR %d", pr.ID)

	// Discord DM to all potential approvers for each group
	for _, approval := range initialApprovals {
		approvers := GetUserIDsForApproverGroup(approval.ApproverGroupID)
		for _, appr := range approvers {
			dm := fmt.Sprintf("<@%s> A new purchase/reimbursement request has been made that needs your approval as a **%s**! \n\n **Please approve or reject this promptly:** https://jiffy.gauchoracing.com/pr/%d#approvals", appr, approval.ApproverGroup.Name, pr.ID)
			SendDirectMessage(appr, dm)
		}
	}

	return pr, nil
}

func UpdatePurchaseRequestStatus(prID int, newStatus model.PurchaseRequestStatus, finalCostCents int, note string, userID string) (model.PurchaseRequest, error) {
	existingPR := GetPurchaseRequestByID(prID, userID)
	if existingPR.ID == 0 {
		return model.PurchaseRequest{}, errors.New("purchase request not found")
	}

	_, err := GetUser(userID)
	if err != nil {
		return model.PurchaseRequest{}, errors.New("user not found")
	}

	// Validate manual status changes
	switch existingPR.Status {
	case model.PurchaseRequestApproved:
		if newStatus != model.PurchaseRequestOrdered {
			return model.PurchaseRequest{}, errors.New("invalid status change")
		}
		if finalCostCents <= 0 {
			return model.PurchaseRequest{}, errors.New("final cost is required when advancing to Ordered")
		}
	case model.PurchaseRequestOrdered:
		if newStatus != model.PurchaseRequestCollected {
			return model.PurchaseRequest{}, errors.New("invalid status change")
		}
	case model.PurchaseRequestCollected:
		if newStatus != model.PurchaseRequestReimbursed {
			return model.PurchaseRequest{}, errors.New("invalid status change")
		}
	default:
		return model.PurchaseRequest{}, errors.New("invalid status change")
	}
	if finalCostCents > 0 && newStatus == model.PurchaseRequestOrdered {
		if err := database.DB.Model(&model.PurchaseRequest{}).Where("id = ?", prID).Update("final_cost_cents", finalCostCents).Error; err != nil {
			return model.PurchaseRequest{}, err
		}
	}
	if err := database.DB.Model(&model.PurchaseRequest{}).Where("id = ?", prID).Update("status", newStatus).Error; err != nil {
		return model.PurchaseRequest{}, err
	}

	message := "Purchase request status changed from '" + string(existingPR.Status) + "' to '" + string(newStatus) + "'"
	if note != "" {
		message = "Purchase request status changed from '" + string(existingPR.Status) + "' to '" + string(newStatus) + "' - '" + note + "'"
	}
	_, _ = CreateNote(prID, model.NoteStatusChanged, userID, message)

	return GetPurchaseRequestByID(prID, userID), nil
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

	// To do: delete from s3
	if err := database.DB.Where("purchase_request_id = ?", prID).Delete(&model.PurchaseRequestAttachment{}).Error; err != nil {
		utils.SugarLogger.Errorf("Error deleting attachments for PR %d: %v", prID, err)
		return err
	}

	if err := database.DB.Where("purchase_request_id = ?", prID).Delete(&model.PurchaseRequestNote{}).Error; err != nil {
		utils.SugarLogger.Errorf("Error deleting notes for PR %d: %v", prID, err)
		return err
	}

	if err := database.DB.Delete(&model.PurchaseRequest{}, prID).Error; err != nil {
		utils.SugarLogger.Errorf("Error deleting PR %d: %v", prID, err)
		return err
	}
	utils.SugarLogger.Infof("Successfully deleted PR %d and all related data", prID)
	return nil
}
