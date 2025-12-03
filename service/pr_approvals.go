package service

import (
	"errors"
	"fmt"
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
	if err := database.DB.First(&approval, "id = ?", approvalID).Error; err != nil {
		utils.SugarLogger.Errorf("Approval not found: %s", approvalID)
		return model.PurchaseRequestApproval{}, errors.New("approval not found")
	}
	if approval.Status != model.ApprovalPending {
		return model.PurchaseRequestApproval{}, errors.New("you can only edit pending approvals")
	}
	if !isApprover(approval.ApproverGroupID, userID) {
		return model.PurchaseRequestApproval{}, errors.New("you are not an approver for this type of approval")
	}

	approval.UserID = userID
	approval.User, _ = GetUser(userID)

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

	if newStatus == model.PurchaseRequestApproved {
		dm := fmt.Sprintf("<@%s> Your purchase request has been **fully approved** for ordering and reimbursement! Contact your leads to manage ordering and shipping, and the treasurer for reimbursement details. \n\n https://jiffy.gauchoracing.com/pr/%d#approvals", pr.UserID, pr.ID)
		SendDirectMessage(pr.UserID, dm)
	} else if newStatus == model.PurchaseRequestRejected {
		if status == model.ApprovalRejected {
			dm := fmt.Sprintf("<@%s> Your purchase request has been **rejected** for ordering and reimbursement by %s! \n\n You **MUST** amend your request or this can't be reimbursed: https://jiffy.gauchoracing.com/pr/%d#approvals", pr.UserID, approval.User.FirstName+" "+approval.User.LastName, pr.ID)
			SendDirectMessage(pr.UserID, dm)
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

func CreateInitialApprovals(prID int) ([]model.PurchaseRequestApproval, error) {
	var pr model.PurchaseRequest
	var approverGroupIDs []string
	var initialApprovals []model.PurchaseRequestApproval

	if err := database.DB.First(&pr, "id = ?", prID).Error; err != nil {
		utils.SugarLogger.Errorf("Error finding purchase request %d: %v", prID, err)
		return []model.PurchaseRequestApproval{}, err
	}
	// refresh old approvals
	if err := DeleteAllApprovals(prID); err != nil {
		utils.SugarLogger.Errorf("Error deleting existing approvals for PR %d: %v", prID, err)
		return []model.PurchaseRequestApproval{}, err
	}

	if err := database.DB.Table("approver_group_department").Where("department_id = ?", pr.DepartmentID).Pluck("approver_group_id", &approverGroupIDs).Error; err != nil {
		utils.SugarLogger.Errorf("Error getting approver group ids for department %s: %v", pr.DepartmentID, err)
		return []model.PurchaseRequestApproval{}, err
	}
	for _, approverGroupID := range approverGroupIDs {
		approverGroup, err := GetApproverGroup(approverGroupID)
		if err != nil {
			utils.SugarLogger.Errorf("Error getting approver group %s for PR %d: %v", approverGroupID, prID, err)
			continue
		}
		if approverGroup.ThresholdCents <= pr.EstimatedCostCents {
			approval := model.PurchaseRequestApproval{
				ID:                uuid.New().String(),
				PurchaseRequestID: prID,
				ApproverGroupID:   approverGroupID,
				Status:            model.ApprovalPending,
				ApproverGroup:     approverGroup,
			}
			initialApprovals = append(initialApprovals, approval)
		}
	}

	if err := database.DB.Create(&initialApprovals).Error; err != nil {
		utils.SugarLogger.Errorf("Error creating initial approvals for PR %d: %v", prID, err)
		return []model.PurchaseRequestApproval{}, err
	}

	utils.SugarLogger.Infof("Successfully created %d initial approvals for PR %d", len(initialApprovals), prID)
	return initialApprovals, nil
}
