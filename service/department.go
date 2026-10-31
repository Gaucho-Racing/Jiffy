package service

import (
	"errors"
	"jiffy/database"
	"jiffy/model"
	"jiffy/utils"

	"github.com/google/uuid"
)

// currentDepartments are the departments new purchase requests can use this
// season. Departments not listed stay in the table for past requests but are
// marked inactive.
var currentDepartments = []model.Department{
	{ID: "AER", Name: "Aerodynamics"},
	{ID: "BUS", Name: "Business"},
	{ID: "CHE", Name: "Chassis & Ergonomics"},
	{ID: "DDA", Name: "Driverless / Data Acquisition"},
	{ID: "DVT", Name: "Drivetrain"},
	{ID: "ECS", Name: "Electronic Controls"},
	{ID: "EPH", Name: "EP&H / Integration"},
	{ID: "PWT", Name: "Powertrain"},
	{ID: "SUS", Name: "Suspension"},
}

// unusedDepartmentIDs were seeded briefly and replaced before any request or
// approver group used them. They are deleted only while still unreferenced.
var unusedDepartmentIDs = []string{"LVH"}

func InitializeDepartments() {
	ids := make([]string, 0, len(currentDepartments))
	for _, department := range currentDepartments {
		department.Active = true
		if _, err := CreateDepartment(department); err != nil {
			utils.SugarLogger.Errorf("Error creating department %s: %v", department.ID, err)
		}
		ids = append(ids, department.ID)
	}
	if err := database.DB.Exec("UPDATE department SET active = (id IN ?)", ids).Error; err != nil {
		utils.SugarLogger.Errorf("Error marking inactive departments: %v", err)
	}
	if err := database.DB.Exec(`
		DELETE FROM department
		WHERE id IN ?
			AND NOT EXISTS (SELECT 1 FROM purchase_request WHERE department_id = department.id)
			AND NOT EXISTS (SELECT 1 FROM approver_group_department WHERE department_id = department.id)
			AND NOT EXISTS (SELECT 1 FROM department_approver WHERE department_id = department.id)
			AND NOT EXISTS (SELECT 1 FROM department_budget WHERE department_id = department.id)
	`, unusedDepartmentIDs).Error; err != nil {
		utils.SugarLogger.Errorf("Error removing unused departments: %v", err)
	}
}

func GetAllDepartments() ([]model.Department, error) {
	var departments []model.Department
	err := database.DB.Order("name").Find(&departments).Error
	hydrateDepartments(departments)
	return departments, err
}

func GetDepartmentByID(id string) (model.Department, error) {
	var department model.Department
	err := database.DB.Where("id = ?", id).First(&department).Error
	if err != nil {
		return department, err
	}
	loaded := []model.Department{department}
	hydrateDepartments(loaded)
	return loaded[0], nil
}

// hydrateDepartments loads approvers and budgets for the given departments in
// a fixed number of queries. The approver rules page used to do this once per
// department and once per approver.
func hydrateDepartments(departments []model.Department) {
	if len(departments) == 0 {
		return
	}
	ids := make([]string, 0, len(departments))
	index := make(map[string]int, len(departments))
	for i := range departments {
		ids = append(ids, departments[i].ID)
		index[departments[i].ID] = i
		departments[i].Approvers = []model.User{}
		departments[i].Budgets = []model.DepartmentBudget{}
	}

	var approverRows []model.DepartmentApprover
	if err := database.DB.Where("department_id IN ?", ids).Find(&approverRows).Error; err != nil {
		utils.SugarLogger.Errorf("Error loading department approvers: %v", err)
	}
	userIDs := make([]string, 0, len(approverRows))
	for _, row := range approverRows {
		userIDs = append(userIDs, row.UserID)
	}
	users := GetUsers(userIDs, "")
	for _, row := range approverRows {
		i, ok := index[row.DepartmentID]
		if !ok {
			continue
		}
		if user, found := users[row.UserID]; found {
			departments[i].Approvers = append(departments[i].Approvers, user)
		}
	}

	var budgets []model.DepartmentBudget
	if err := database.DB.Where("department_id IN ?", ids).Order("date").Find(&budgets).Error; err != nil {
		utils.SugarLogger.Errorf("Error loading department budgets: %v", err)
		return
	}
	for _, budget := range budgets {
		i, ok := index[budget.DepartmentID]
		if !ok {
			continue
		}
		departments[i].Budgets = append(departments[i].Budgets, budget)
	}
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
	loaded := []model.Department{{ID: departmentID}}
	hydrateDepartments(loaded)
	return loaded[0].Approvers
}

func AddApproverToDepartment(departmentID string, approverID string) error {
	result := database.DB.Create(&model.DepartmentApprover{
		DepartmentID: departmentID,
		UserID:       approverID,
	})
	if result.Error != nil {
		return result.Error
	}
	return nil
}

func RemoveApproverFromDepartment(departmentID string, approverID string) error {
	result := database.DB.Exec("DELETE FROM department_approver WHERE department_id = ? AND user_id = ?", departmentID, approverID)
	if result.Error != nil {
		return result.Error
	}
	return nil
}

func GetBudgetsForDepartment(departmentID string) []model.DepartmentBudget {
	var budgets []model.DepartmentBudget
	database.DB.Where("department_id = ?", departmentID).Order("date").Find(&budgets)
	return budgets
}

func AddBudgetToDepartment(departmentID string, budget model.DepartmentBudget) (*model.DepartmentBudget, error) {
	if budget.ID == "" {
		budget.ID = uuid.New().String()
	}
	if database.DB.Where("id = ?", budget.ID).Updates(&budget).RowsAffected == 0 {
		utils.SugarLogger.Infoln("New budget created with id: " + budget.ID + " for department: " + departmentID)
		result := database.DB.Create(&budget)
		if result.Error != nil {
			return nil, result.Error
		}
	} else {
		utils.SugarLogger.Infoln("Budget with id: " + budget.ID + " has been updated for department: " + departmentID)
	}
	return &budget, nil
}

func RemoveBudgetFromDepartment(departmentID string, budgetID string) error {
	result := database.DB.Exec("DELETE FROM department_budget WHERE id = ?", budgetID)
	if result.Error != nil {
		return result.Error
	}
	return nil
}
