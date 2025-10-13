package model

import "time"

type Approval struct {
	ID        int            `json:"id" gorm:"primaryKey;autoIncrement"`
	PrID      int            `json:"pr_id"`
	UserID    string         `json:"user_id"`
	User      User           `json:"user" gorm:"-"`
	Type      ApprovalType   `json:"type"`
	Status    ApprovalStatus `json:"status"`
	Note      string         `json:"note"`
	CreatedAt time.Time      `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt time.Time      `gorm:"autoUpdateTime" json:"updated_at"`
}

func (Approval) TableName() string {
	return "approval"
}

type ApprovalStatus string

const (
	ApprovalPending  ApprovalStatus = "Pending"
	ApprovalApproved ApprovalStatus = "Approved"
	ApprovalRejected ApprovalStatus = "Rejected"
)

type ApprovalType string

const (
	LeadApproval      ApprovalType = "Lead"
	TreasurerApproval ApprovalType = "Treasurer"
	PresidentApproval ApprovalType = "President"
)
