package model

import "time"

type PurchaseRequestItem struct {
	ID                string    `json:"id" gorm:"primaryKey"`
	PurchaseRequestID int       `json:"purchase_request_id"`
	URL               string    `json:"url"`
	Name              string    `json:"name"`
	UnitPriceCents    int       `json:"unit_price_cents"`
	Quantity          int       `json:"quantity"`
	CreatedAt         time.Time `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt         time.Time `gorm:"autoUpdateTime" json:"updated_at"`
}

func (PurchaseRequestItem) TableName() string {
	return "purchase_request_item"
}
