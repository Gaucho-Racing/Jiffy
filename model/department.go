package model

import "time"

type Department struct {
	ID        string             `json:"id" gorm:"primaryKey"`
	Name      string             `json:"name"`
	Approvers []User             `json:"approvers" gorm:"-"`
	Budgets   []DepartmentBudget `json:"budgets" gorm:"-"`
	UpdatedAt time.Time          `json:"updated_at" gorm:"autoUpdateTime"`
	CreatedAt time.Time          `json:"created_at" gorm:"autoCreateTime"`
}

func (Department) TableName() string {
	return "department"
}

type DepartmentApprover struct {
	DepartmentID string    `json:"department_id" gorm:"primaryKey"`
	UserID       string    `json:"user_id" gorm:"primaryKey"`
	CreatedAt    time.Time `json:"created_at" gorm:"autoCreateTime"`
}

func (DepartmentApprover) TableName() string {
	return "department_approver"
}

type DepartmentBudget struct {
	ID           string    `json:"id" gorm:"primaryKey"`
	DepartmentID string    `json:"department_id"`
	Date         time.Time `json:"date"`
	Amount       int       `json:"amount"`
	CreatedAt    time.Time `json:"created_at" gorm:"autoCreateTime"`
}

func (DepartmentBudget) TableName() string {
	return "department_budget"
}
