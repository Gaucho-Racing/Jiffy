package model

import "time"

type Department struct {
	ID        string             `json:"id" gorm:"primaryKey"`
	Name      string             `json:"name"`
	Approvers []User             `json:"approvers" gorm:"-"`
	Budget    []DepartmentBudget `json:"budget" gorm:"-"`
	UpdatedAt time.Time          `json:"updated_at" gorm:"autoUpdateTime"`
	CreatedAt time.Time          `json:"created_at" gorm:"autoCreateTime"`
}

type DepartmentApprover struct {
	DepartmentID string    `json:"department_id" gorm:"primaryKey"`
	UserID       string    `json:"user_id" gorm:"primaryKey"`
	CreatedAt    time.Time `json:"created_at" gorm:"autoCreateTime"`
}

type DepartmentBudget struct {
	DepartmentID string    `json:"department_id"`
	Date         time.Time `json:"date"`
	Amount       int       `json:"amount"`
	CreatedAt    time.Time `json:"created_at" gorm:"autoCreateTime"`
}
