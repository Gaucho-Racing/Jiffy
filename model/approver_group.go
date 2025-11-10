package model

import "time"

type ApproverGroup struct {
	ID             string       `json:"id" gorm:"primaryKey"`
	Name           string       `json:"name"`
	Departments    []Department `json:"departments" gorm:"-"`
	Approvers      []User       `json:"approvers" gorm:"-"`
	ThresholdCents int          `json:"threshold_cents"`
	UpdatedAt      time.Time    `json:"updated_at" gorm:"autoUpdateTime"`
	CreatedAt      time.Time    `json:"created_at" gorm:"autoCreateTime"`
}

func (ApproverGroup) TableName() string {
	return "approver_group"
}

type ApproverGroupDepartment struct {
	ApproverGroupID string    `json:"approver_group_id" gorm:"primaryKey"`
	DepartmentID    string    `json:"department_id" gorm:"primaryKey"`
	CreatedAt       time.Time `json:"created_at" gorm:"autoCreateTime"`
}

func (ApproverGroupDepartment) TableName() string {
	return "approver_group_department"
}

type ApproverGroupApprover struct {
	ApproverGroupID string    `json:"approver_group_id" gorm:"primaryKey"`
	UserID          string    `json:"user_id" gorm:"primaryKey"`
	CreatedAt       time.Time `json:"created_at" gorm:"autoCreateTime"`
}

func (ApproverGroupApprover) TableName() string {
	return "approver_group_approver"
}
