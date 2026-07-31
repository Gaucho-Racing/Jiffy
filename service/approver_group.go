package service

import (
	"errors"
	"jiffy/database"
	"jiffy/model"
	"jiffy/utils"
	"time"

	"github.com/google/uuid"
)

func GetAllApproverGroups(accessToken string) ([]model.ApproverGroup, error) {
	var approverGroups []model.ApproverGroup
	if err := database.DB.Find(&approverGroups).Error; err != nil {
		return nil, err
	}
	for i := range approverGroups {
		approverGroups[i].Departments = GetDepartmentsForApproverGroup(approverGroups[i].ID)
		approverGroups[i].Approvers = GetApproversForApproverGroup(approverGroups[i].ID, accessToken)
	}
	return approverGroups, nil
}

func isApprover(groupID string, userID string) bool {
	if err := database.DB.Table("approver_group_approver").Where("approver_group_id = ? AND user_id = ?", groupID, userID).First(&model.ApproverGroupApprover{}).Error; err != nil {
		return false
	}
	return true
}

func GetApproverGroup(groupID string, accessToken string) (model.ApproverGroup, error) {
	var approverGroup model.ApproverGroup
	if err := database.DB.First(&approverGroup, "id = ?", groupID).Error; err != nil {
		return model.ApproverGroup{}, err
	}
	approverGroup.Departments = GetDepartmentsForApproverGroup(groupID)
	approverGroup.Approvers = GetApproversForApproverGroup(groupID, accessToken)
	return approverGroup, nil
}

func GetDepartmentsForApproverGroup(groupID string) []model.Department {
	var departments []model.Department
	var departmentIDs []string
	if err := database.DB.Table("approver_group_department").Where("approver_group_id = ?", groupID).Pluck("department_id", &departmentIDs).Error; err != nil {
		return nil
	}
	for _, departmentID := range departmentIDs {
		department, _ := GetDepartmentByID(departmentID)
		departments = append(departments, department)
	}
	return departments
}

func GetApproversForApproverGroup(groupID string, accessToken string) []model.User {
	var userIDs []string
	if err := database.DB.Table("approver_group_approver").Where("approver_group_id = ?", groupID).Pluck("user_id", &userIDs).Error; err != nil {
		return nil
	}
	usersByID := GetUsers(userIDs, accessToken)
	approvers := make([]model.User, 0, len(userIDs))
	for _, userID := range userIDs {
		if user, ok := usersByID[userID]; ok {
			approvers = append(approvers, user)
		} else {
			approvers = append(approvers, model.User{ID: userID, Groups: []string{}})
		}
	}
	return approvers
}

func CreateApproverGroup(approverGroup model.ApproverGroup) (model.ApproverGroup, error) {
	if approverGroup.Name == "" {
		return model.ApproverGroup{}, errors.New("approver group name is required")
	}
	if approverGroup.ThresholdCents < 0 {
		return model.ApproverGroup{}, errors.New("threshold_cents must be non-negative")
	}
	if approverGroup.ID == "" {
		approverGroup.ID = uuid.New().String()
	}

	var departmentIDs []string
	for _, dept := range approverGroup.Departments {
		if dept.ID != "" {
			departmentIDs = append(departmentIDs, dept.ID)
		}
	}

	var userIDs []string
	for _, approver := range approverGroup.Approvers {
		if approver.ID != "" {
			userIDs = append(userIDs, approver.ID)
		}
	}

	if database.DB.Where("id = ?", approverGroup.ID).Updates(&approverGroup).RowsAffected == 0 {
		utils.SugarLogger.Infoln("New approver group created with id: " + approverGroup.ID)
		if result := database.DB.Create(&approverGroup); result.Error != nil {
			return model.ApproverGroup{}, result.Error
		}
	} else {
		utils.SugarLogger.Infoln("Approver group with id: " + approverGroup.ID + " has been updated!")
	}
	SetDepartmentIDsForApproverGroup(approverGroup.ID, departmentIDs)
	SetUserIDsForApproverGroup(approverGroup.ID, userIDs)
	return GetApproverGroup(approverGroup.ID, "")
}

// TODO: fix edge case of orphaned pr_approval
func DeleteApproverGroup(groupID string) error {
	var approverGroup model.ApproverGroup
	if err := database.DB.First(&approverGroup, "id = ?", groupID).Error; err != nil {
		utils.SugarLogger.Errorf("Approver group with id %s not found: %v", groupID, err)
		return errors.New("approver group not found")
	}

	if err := database.DB.Where("id = ?", groupID).Delete(&model.ApproverGroup{}).Error; err != nil {
		utils.SugarLogger.Errorf("Error deleting approver group with id: %s: %v", groupID, err)
		return err
	}
	if err := database.DB.Where("approver_group_id = ?", groupID).Delete(&model.ApproverGroupDepartment{}).Error; err != nil {
		utils.SugarLogger.Errorf("Error deleting approver group departments with id: %s: %v", groupID, err)
		return err
	}
	if err := database.DB.Where("approver_group_id = ?", groupID).Delete(&model.ApproverGroupApprover{}).Error; err != nil {
		utils.SugarLogger.Errorf("Error deleting approver group approvers with id: %s: %v", groupID, err)
		return err
	}
	utils.SugarLogger.Infof("Successfully deleted approver group with id: %s", groupID)
	return nil
}

// Returns an ApproverGroup with only ID and Name fields, omitting Departments and Approvers
func GetApproverGroupNameOnly(groupID string) (model.ApproverGroup, error) {
	if groupID == "" {
		return model.ApproverGroup{}, errors.New("group id is required")
	}

	var groupName string
	if err := database.DB.Model(&model.ApproverGroup{}).Where("id = ?", groupID).Pluck("name", &groupName).Error; err != nil {
		utils.SugarLogger.Errorf("Error getting approver group name only with id %s: %v", groupID, err)
		return model.ApproverGroup{}, err
	}
	return model.ApproverGroup{
		ID:   groupID,
		Name: groupName,
	}, nil
}

// GetApproverGroupForApprovalCheck returns name + approver ids (no nested profile
// hydration) so the UI can check currentUser.id membership cheaply.
func GetApproverGroupForApprovalCheck(groupID string) (model.ApproverGroup, error) {
	group, err := GetApproverGroupNameOnly(groupID)
	if err != nil {
		return model.ApproverGroup{}, err
	}
	var userIDs []string
	if err := database.DB.Table("approver_group_approver").Where("approver_group_id = ?", groupID).Pluck("user_id", &userIDs).Error; err != nil {
		return group, nil
	}
	approvers := make([]model.User, 0, len(userIDs))
	for _, id := range userIDs {
		approvers = append(approvers, model.User{ID: id, Groups: []string{}})
	}
	group.Approvers = approvers
	return group, nil
}

func GetDepartmentIDsForApproverGroup(groupID string) []string {
	var departmentIDs []string
	result := database.DB.Table("approver_group_department").Where("approver_group_id = ?", groupID).Pluck("department_id", &departmentIDs)
	if result.Error != nil {
		return nil
	}
	return departmentIDs
}

func SetDepartmentIDsForApproverGroup(groupID string, departmentIDs []string) []string {
	existingDepartmentIDs := GetDepartmentIDsForApproverGroup(groupID)
	for _, nd := range departmentIDs {
		if !contains(existingDepartmentIDs, nd) {
			result := database.DB.Create(&model.ApproverGroupDepartment{
				ApproverGroupID: groupID,
				DepartmentID:    nd,
				CreatedAt:       time.Time{},
			})
			if result.Error != nil {
				utils.SugarLogger.Errorln(result.Error.Error())
			}
		}
	}
	for _, ed := range existingDepartmentIDs {
		if !contains(departmentIDs, ed) {
			database.DB.Where("approver_group_id = ? AND department_id = ?", groupID, ed).Delete(&model.ApproverGroupDepartment{})
		}
	}
	return GetDepartmentIDsForApproverGroup(groupID)
}

func GetUserIDsForApproverGroup(groupID string) []string {
	var userIDs []string
	result := database.DB.Table("approver_group_approver").Where("approver_group_id = ?", groupID).Pluck("user_id", &userIDs)
	if result.Error != nil {
		return nil
	}
	return userIDs
}

func SetUserIDsForApproverGroup(groupID string, userIDs []string) []string {
	existingUserIDs := GetUserIDsForApproverGroup(groupID)
	for _, nu := range userIDs {
		if !contains(existingUserIDs, nu) {
			result := database.DB.Create(&model.ApproverGroupApprover{
				ApproverGroupID: groupID,
				UserID:          nu,
				CreatedAt:       time.Time{},
			})
			if result.Error != nil {
				utils.SugarLogger.Errorln(result.Error.Error())
			}
		}
	}
	for _, eu := range existingUserIDs {
		if !contains(userIDs, eu) {
			database.DB.Where("approver_group_id = ? AND user_id = ?", groupID, eu).Delete(&model.ApproverGroupApprover{})
		}
	}
	return GetUserIDsForApproverGroup(groupID)
}
