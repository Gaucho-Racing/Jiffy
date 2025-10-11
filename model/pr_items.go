package model

import "time"

type PurchaseRequestItem struct {
	ID                 int       `json:"id" gorm:"primaryKey;autoIncrement"`
	PurchaseRequestID  int       `json:"purchase_request_id"`
	ItemURL            string    `json:"item_url"`
	ItemName           string    `json:"item_name"`
	ItemUnitPriceCents int       `json:"item_unit_price_cents"`
	ItemQuantity       int       `json:"item_quantity"`
	CreatedAt          time.Time `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt          time.Time `gorm:"autoUpdateTime" json:"updated_at"`
}

func (PurchaseRequestItem) TableName() string {
	return "purchase_request_item"
}
