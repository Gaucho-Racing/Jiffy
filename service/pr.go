package service

import (
	"errors"
	"fmt"
	"jiffy/database"
	"jiffy/model"
	"jiffy/utils"
	"strings"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

func GetAllPurchaseRequests() []model.PurchaseRequest {
	return GetAllPurchaseRequestsWithToken("")
}

func GetAllPurchaseRequestsWithToken(accessToken string) []model.PurchaseRequest {
	var prs []model.PurchaseRequest
	// List view only needs items + author names — skip approvals/notes preloads.
	if err := database.DB.Preload("Items").Order("created_at DESC").Find(&prs).Error; err != nil {
		utils.SugarLogger.Errorf("Error getting purchase requests: %v", err)
		return nil
	}
	ids := make([]string, 0, len(prs))
	for i := range prs {
		ids = append(ids, prs[i].UserID)
	}
	users := GetUsers(ids, accessToken)
	for i := range prs {
		if user, ok := users[prs[i].UserID]; ok {
			prs[i].User = user
		}
	}
	return prs
}

func GetActionRequiredPurchaseRequests(userID string, accessToken string) []model.PurchaseRequest {
	var prs []model.PurchaseRequest
	if err := database.DB.Preload("Items").Preload("Approvals").Where("status = ?", model.PurchaseRequestPending).Order("created_at DESC").Find(&prs).Error; err != nil {
		utils.SugarLogger.Errorf("Error getting action required purchase requests: %v", err)
		return nil
	}

	ids := make([]string, 0, len(prs))
	for _, pr := range prs {
		ids = append(ids, pr.UserID)
	}
	users := GetUsers(ids, accessToken)

	var filtered []model.PurchaseRequest
	for _, pr := range prs {
		if user, ok := users[pr.UserID]; ok {
			pr.User = user
		}
		hasActionable := false
		for _, approval := range pr.Approvals {
			if approval.Status == model.ApprovalPending && isApprover(approval.ApproverGroupID, userID) {
				hasActionable = true
				break
			}
		}
		if hasActionable {
			filtered = append(filtered, pr)
		}
	}
	return filtered
}

func GetPurchaseRequestByID(id int, userID string, viewerGroups []string, accessToken string) model.PurchaseRequest {
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

	ids := []string{pr.UserID}
	if pr.ReimburseToUserID != "" {
		ids = append(ids, pr.ReimburseToUserID)
	}
	for i := range pr.Approvals {
		if pr.Approvals[i].UserID != "" {
			ids = append(ids, pr.Approvals[i].UserID)
		}
	}
	for i := range pr.Notes {
		ids = append(ids, pr.Notes[i].UserID)
	}
	for i := range pr.Attachments {
		ids = append(ids, pr.Attachments[i].UserID)
	}
	users := GetUsers(ids, accessToken)

	if user, ok := users[pr.UserID]; ok {
		pr.User = user
	}
	if pr.ReimburseToUserID != "" {
		if user, ok := users[pr.ReimburseToUserID]; ok {
			pr.ReimburseToUser = user
		}
	}
	groupCache := map[string]model.ApproverGroup{}
	for i := range pr.Approvals {
		if pr.Approvals[i].UserID != "" {
			if user, ok := users[pr.Approvals[i].UserID]; ok {
				pr.Approvals[i].User = user
			}
		}
		gid := pr.Approvals[i].ApproverGroupID
		if group, ok := groupCache[gid]; ok {
			pr.Approvals[i].ApproverGroup = group
		} else {
			group, _ := GetApproverGroupForApprovalCheck(gid)
			groupCache[gid] = group
			pr.Approvals[i].ApproverGroup = group
		}
	}
	for i := range pr.Notes {
		if user, ok := users[pr.Notes[i].UserID]; ok {
			pr.Notes[i].User = user
		}
	}
	for i := range pr.Attachments {
		if user, ok := users[pr.Attachments[i].UserID]; ok {
			pr.Attachments[i].User = user
		}
	}
	if pr.UserID != userID && !model.IsInnerCircle(viewerGroups) {
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

func CreatePurchaseRequest(pr model.PurchaseRequest, userID string, accessToken string) (model.PurchaseRequest, error) {
	isNew := pr.ID == 0

	var existingPR model.PurchaseRequest
	if isNew {
		pr.UserID = userID
	} else {
		existingPR = GetPurchaseRequestByID(pr.ID, userID, nil, accessToken)
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
	pr.EstimatedCostCents = calculateEstimatedCost(pr.Items) + pr.ShippingTaxCostCents - pr.DiscountsCents
	if isNew {
		pr.ReimbursementType = string(model.ReimbursementNotYet)
	}
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
			if pr.DiscountsCents == 0 && existingPR.DiscountsCents != 0 {
				if err := database.DB.Model(&model.PurchaseRequest{}).Where("id = ?", pr.ID).Update("discounts_cents", 0).Error; err != nil {
					utils.SugarLogger.Errorf("Error updating discounts for PR %d: %v", pr.ID, err)
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
	pr = GetPurchaseRequestByID(pr.ID, userID, nil, accessToken)
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

func UpdatePurchaseRequestStatus(prID int, newStatus model.PurchaseRequestStatus, note string, userID string, viewerGroups []string, accessToken string) (model.PurchaseRequest, error) {
	existingPR := GetPurchaseRequestByID(prID, userID, viewerGroups, accessToken)
	if existingPR.ID == 0 {
		return model.PurchaseRequest{}, errors.New("purchase request not found")
	}

	if strings.TrimSpace(userID) == "" {
		return model.PurchaseRequest{}, errors.New("user not found")
	}

	// Validate manual status changes
	switch existingPR.Status {
	case model.PurchaseRequestApproved:
		if newStatus != model.PurchaseRequestOrdered {
			return model.PurchaseRequest{}, errors.New("invalid status change")
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

	if err := database.DB.Model(&model.PurchaseRequest{}).Where("id = ?", prID).Update("status", newStatus).Error; err != nil {
		return model.PurchaseRequest{}, err
	}

	message := "Purchase request status changed from '" + string(existingPR.Status) + "' to '" + string(newStatus) + "'"
	if note != "" {
		message = "Purchase request status changed from '" + string(existingPR.Status) + "' to '" + string(newStatus) + "' - '" + note + "'"
	}
	_, _ = CreateNote(prID, model.NoteStatusChanged, userID, message)

	return GetPurchaseRequestByID(prID, userID, viewerGroups, accessToken), nil
}

func UpdatePurchaseRequestFields(prID int, userID string, viewerGroups []string, accessToken string, updates map[string]interface{}) (model.PurchaseRequest, error) {
	if len(updates) == 0 {
		return model.PurchaseRequest{}, errors.New("no fields provided")
	}

	existingPR := GetPurchaseRequestByID(prID, userID, viewerGroups, accessToken)
	if existingPR.ID == 0 {
		return model.PurchaseRequest{}, errors.New("purchase request not found")
	}

	if strings.TrimSpace(userID) == "" {
		return model.PurchaseRequest{}, errors.New("user not found")
	}

	if existingPR.UserID != userID && !model.IsInnerCircle(viewerGroups) {
		return model.PurchaseRequest{}, errors.New("you can only edit your own purchase requests")
	}

	onlyReimburseUser := len(updates) == 1 && updates["reimburse_to_user_id"] != nil
	if !onlyReimburseUser && (existingPR.Status == model.PurchaseRequestPending || existingPR.Status == model.PurchaseRequestRejected) {
		return model.PurchaseRequest{}, errors.New("You can only change this after approval for clarity purposes! Please edit your request through the form and await approval.")
	}

	if err := database.DB.Model(&model.PurchaseRequest{}).Where("id = ?", prID).Updates(updates).Error; err != nil {
		utils.SugarLogger.Errorf("Error updating PR %d fields: %v", prID, err)
		return model.PurchaseRequest{}, err
	}

	// Create a note describing the field changes with before/after values
	changeMessages := []string{}
	fieldMapping := map[string]string{
		"component":               "Component",
		"vendor":                  "Vendor",
		"priority":                "Priority",
		"needed_by_date":          "Needed By Date",
		"description":             "Description",
		"reimbursement_type":      "Reimbursement Type",
		"final_cost_cents":        "Final Price",
		"requested_purchaser":     "Requested Purchaser",
		"reimburse_to_user_id":    "Reimburse To User",
		"placed_order_unapproved": "Placed Order Without Approval",
	}

	for fieldKey, newValue := range updates {
		displayName := fieldMapping[fieldKey]
		if displayName == "" {
			continue
		}

		var oldValueStr, newValueStr string

		// Get old values and format for display
		switch fieldKey {
		case "component":
			oldValueStr = existingPR.Component
			newValueStr = fmt.Sprintf("%v", newValue)
		case "vendor":
			oldValueStr = existingPR.Vendor
			newValueStr = fmt.Sprintf("%v", newValue)
		case "priority":
			oldValueStr = fmt.Sprintf("%d", existingPR.Priority)
			newValueStr = fmt.Sprintf("%v", newValue)
		case "needed_by_date":
			oldValueStr = existingPR.NeededByDate.Format("2006-01-02")
			newValueStr = fmt.Sprintf("%v", newValue)
		case "description":
			oldValueStr = existingPR.Description
			newValueStr = fmt.Sprintf("%v", newValue)
		case "reimbursement_type":
			oldValueStr = existingPR.ReimbursementType
			newValueStr = fmt.Sprintf("%v", newValue)
		case "final_cost_cents":
			oldValueStr = fmt.Sprintf("$%.2f", float64(existingPR.FinalCostCents)/100)
			if newValInt, ok := newValue.(float64); ok {
				newValueStr = fmt.Sprintf("$%.2f", newValInt/100)
			} else {
				newValueStr = fmt.Sprintf("%v", newValue)
			}
		case "requested_purchaser":
			oldValueStr = existingPR.RequestedPurchaser
			newValueStr = fmt.Sprintf("%v", newValue)
		case "reimburse_to_user_id":
			if existingPR.ReimburseToUserID != "" {
				oldValueStr = fmt.Sprintf("%s %s", existingPR.ReimburseToUser.FirstName, existingPR.ReimburseToUser.LastName)
			} else {
				oldValueStr = "Not Set"
			}
			if newUserID, ok := newValue.(string); ok {
				if newUser, err := GetUser(newUserID, accessToken); err == nil {
					newValueStr = fmt.Sprintf("%s %s", newUser.FirstName, newUser.LastName)
				} else {
					newValueStr = fmt.Sprintf("%v", newValue)
				}
			} else {
				newValueStr = fmt.Sprintf("%v", newValue)
			}
		case "placed_order_unapproved":
			oldValueStr = fmt.Sprintf("%v", existingPR.PlacedOrderUnapproved)
			newValueStr = fmt.Sprintf("%v", newValue)
		}

		changeMessages = append(changeMessages, fmt.Sprintf("Updated the field %s from '%s' to '%s'", displayName, oldValueStr, newValueStr))
	}

	// Create notes for all changes
	if len(changeMessages) > 0 {
		var noteMessage string
		if len(changeMessages) == 1 {
			noteMessage = changeMessages[0]
		} else {
			noteMessage = fmt.Sprintf("Multiple updates: %s", fmt.Sprint(changeMessages))
		}
		_, _ = CreateNote(prID, model.NoteRequestAmended, userID, noteMessage)
	}

	return GetPurchaseRequestByID(prID, userID, viewerGroups, accessToken), nil
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
