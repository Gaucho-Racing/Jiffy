package service

import (
	"errors"
	"jiffy/database"
	"jiffy/model"
	"jiffy/utils"

	"github.com/google/uuid"
)

func GetPurchaseRequestApprovals(prID int) []model.PurchaseRequestApproval {
	var approvals []model.PurchaseRequestApproval
	if err := database.DB.Where("purchase_request_id = ?", prID).Find(&approvals).Error; err != nil {
		utils.SugarLogger.Errorf("Error getting approvals for purchase request with id: %s, error: %v", prID, err)
		return nil
	}
	for i := range approvals {
		approvals[i].User, _ = GetUser(approvals[i].UserID)
		approvals[i].ApproverGroup, _ = GetApproverGroupNameOnly(approvals[i].ApproverGroupID)
	}
	return approvals
}

func EditApproval(approvalID string, status model.ApprovalStatus, note string, userID string) (model.PurchaseRequestApproval, error) {
	var approval model.PurchaseRequestApproval
	if err := database.DB.First(&approval, approvalID).Error; err != nil {
		utils.SugarLogger.Errorf("Approval not found: %d", approvalID)
		return model.PurchaseRequestApproval{}, errors.New("approval not found")
	}
	if approval.Status != model.ApprovalPending {
		return model.PurchaseRequestApproval{}, errors.New("you can only edit pending approvals")
	}
	approval.UserID = userID
	approval.User, _ = GetUser(userID)

	if !isApprover(approval.ApproverGroupID, userID) {
		return model.PurchaseRequestApproval{}, errors.New("you are not an approver for this type of approval")
	}

	approval.Status = status

	if database.DB.Where("id = ?", approval.ID).Select("*").Updates(&approval).RowsAffected == 0 {
		utils.SugarLogger.Infof("Approval not updated")
	} else {
		utils.SugarLogger.Infof("Approval Status updated to %s", approval.Status)
		if status == model.ApprovalApproved {
			_, _ = CreateNote(approval.PurchaseRequestID, model.NoteApproved, userID, "Approval approved: '"+note+"'")
		} else if status == model.ApprovalRejected {
			_, _ = CreateNote(approval.PurchaseRequestID, model.NoteRejected, userID, "Approval rejected: '"+note+"'")
		}
	}

	pr := GetPurchaseRequestByID(approval.PurchaseRequestID, userID)

	newStatus := model.PurchaseRequestApproved
	for _, appr := range pr.Approvals {
		if appr.Status == model.ApprovalRejected {
			newStatus = model.PurchaseRequestRejected
			break
		} else if appr.Status == model.ApprovalPending {
			newStatus = model.PurchaseRequestPending
		}
	}
	if newStatus != pr.Status {
		if err := database.DB.Model(&model.PurchaseRequest{}).Where("id = ?", approval.PurchaseRequestID).Update("status", newStatus).Error; err != nil {
			utils.SugarLogger.Errorf("Error updating PR status after approval: %v", err)
		}
	}

	approval.ApproverGroup, _ = GetApproverGroupNameOnly(approval.ApproverGroupID)

	return approval, nil
}

func DeleteAllApprovals(prID int) error {
	if err := database.DB.Where("purchase_request_id = ?", prID).Delete(&model.PurchaseRequestApproval{}).Error; err != nil {
		utils.SugarLogger.Errorf("Error deleting approvals for PR %d: %v", prID, err)
		return err
	}
	utils.SugarLogger.Infof("Successfully deleted all approvals for PR %d", prID)
	return nil
}

func CreateInitialApprovals(prID int) error {
	var pr model.PurchaseRequest
	if err := database.DB.First(&pr, "id = ?", prID).Error; err != nil {
		utils.SugarLogger.Errorf("Error finding purchase request %d: %v", prID, err)
		return err
	}
	if err := DeleteAllApprovals(prID); err != nil {
		utils.SugarLogger.Errorf("Error deleting existing approvals for PR %d: %v", prID, err)
		return err
	}

	var approverGroupIDs []string
	var initialApprovals []model.PurchaseRequestApproval
	if err := database.DB.Table("approver_group_department").Where("department_id = ?", pr.DepartmentID).Pluck("approver_group_id", &approverGroupIDs).Error; err != nil {
		utils.SugarLogger.Errorf("Error getting approver group ids for department %s: %v", pr.DepartmentID, err)
		return err
	}
	for _, approverGroupID := range approverGroupIDs {
		approverGroup, _ := GetApproverGroup(approverGroupID)
		if approverGroup.ThresholdCents <= pr.EstimatedCostCents {
			initialApprovals = append(initialApprovals, model.PurchaseRequestApproval{ID: uuid.New().String(), PurchaseRequestID: prID, ApproverGroupID: approverGroupID, Status: model.ApprovalPending})
		}
	}

	if err := database.DB.Create(&initialApprovals).Error; err != nil {
		utils.SugarLogger.Errorf("Error creating initial approvals for PR %d: %v", prID, err)
		return err
	}

	utils.SugarLogger.Infof("Successfully created %d initial approvals for PR %d", len(initialApprovals), prID)
	return nil
}
