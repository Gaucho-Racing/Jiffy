package model

import "time"

type PurchaseRequestAttachment struct {
	ID                int       `json:"id" gorm:"primaryKey;autoIncrement"`
	PurchaseRequestID int       `json:"purchase_request_id"`
	UserID            string    `json:"user_id"`
	User              User      `json:"user" gorm:"-"`
	URL               string    `json:"url"`
	CreatedAt         time.Time `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt         time.Time `gorm:"autoUpdateTime" json:"updated_at"`
}

func (PurchaseRequestAttachment) TableName() string {
	return "purchase_request_attachment"
}
