package model

import "time"

type PurchaseRequestReceipt struct {
	ID                int       `json:"id" gorm:"primaryKey;autoIncrement"`
	PurchaseRequestID int       `json:"purchase_request_id"`
	URL               string    `json:"url"`
	CreatedAt         time.Time `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt         time.Time `gorm:"autoUpdateTime" json:"updated_at"`
}

func (PurchaseRequestReceipt) TableName() string {
	return "purchase_request_receipt"
}
