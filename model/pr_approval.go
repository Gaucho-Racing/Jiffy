package model

import "time"

type PurchaseRequestApproval struct {
	ID                string         `json:"id" gorm:"primaryKey"`
	PurchaseRequestID int            `json:"purchase_request_id"`
	UserID            string         `json:"user_id"`
	User              User           `json:"user" gorm:"-"`
	ApproverGroupID   string         `json:"approver_group_id"`
	ApproverGroup     ApproverGroup  `json:"approver_group" gorm:"-"`
	Status            ApprovalStatus `json:"status"`
	CreatedAt         time.Time      `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt         time.Time      `gorm:"autoUpdateTime" json:"updated_at"`
}

func (PurchaseRequestApproval) TableName() string {
	return "approval"
}

type ApprovalStatus string

const (
	ApprovalPending  ApprovalStatus = "Pending"
	ApprovalApproved ApprovalStatus = "Approved"
	ApprovalRejected ApprovalStatus = "Rejected"
)
