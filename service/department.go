package service

import (
	"errors"
	"jiffy/database"
	"jiffy/model"
	"jiffy/utils"
)

func InitializeDepartments() {
	CreateDepartment(model.Department{
		ID:   "AER",
		Name: "Aerodynamics",
	})
	CreateDepartment(model.Department{
		ID:   "BUS",
		Name: "Business",
	})
	CreateDepartment(model.Department{
		ID:   "CHS",
		Name: "Chassis",
	})
	CreateDepartment(model.Department{
		ID:   "DAT",
		Name: "Data",
	})
	CreateDepartment(model.Department{
		ID:   "ELC",
		Name: "Electronics",
	})
	CreateDepartment(model.Department{
		ID:   "PWT",
		Name: "Powertrain",
	})
	CreateDepartment(model.Department{
		ID:   "SUS",
		Name: "Suspension",
	})
}

func GetAllDepartments() ([]model.Department, error) {
	var departments []model.Department
	err := database.DB.Find(&departments).Error
	for i, department := range departments {
		departments[i].Approvers = GetApproversForDepartment(department.ID)
		departments[i].Budgets = GetBudgetsForDepartment(department.ID)
	}
	return departments, err
}

func GetDepartmentByID(id string) (model.Department, error) {
	var department model.Department
	err := database.DB.First(&department, id).Error
	department.Approvers = GetApproversForDepartment(department.ID)
	department.Budgets = GetBudgetsForDepartment(department.ID)
	return department, err
}

func CreateDepartment(department model.Department) (model.Department, error) {
	if department.ID == "" {
		return model.Department{}, errors.New("department id is required")
	} else if department.Name == "" {
		return model.Department{}, errors.New("department name is required")
	}
	if database.DB.Where("id = ?", department.ID).Updates(&department).RowsAffected == 0 {
		utils.SugarLogger.Infoln("New department created with id: " + department.ID)
		if result := database.DB.Create(&department); result.Error != nil {
			return model.Department{}, result.Error
		}
	} else {
		utils.SugarLogger.Infoln("Department with id: " + department.ID + " has been updated!")
	}
	return department, nil
}

func GetApproversForDepartment(departmentID string) []model.User {
	var approverIds []string
	database.DB.Table("department_approver").Where("department_id = ?", departmentID).Pluck("user_id", &approverIds)
	var approvers []model.User
	for _, approverId := range approverIds {
		user, err := GetUser(approverId)
		if err != nil {
			utils.SugarLogger.Errorln("Error getting approver with id: " + approverId + " for department: " + departmentID)
		} else {
			approvers = append(approvers, user)
		}
	}
	return approvers
}

func GetBudgetsForDepartment(departmentID string) []model.DepartmentBudget {
	var budgets []model.DepartmentBudget
	database.DB.Where("department_id = ?", departmentID).Order("date").Find(&budgets)
	return budgets
}
