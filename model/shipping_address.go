package model

import "time"

type ShippingAddress struct {
	ID            int       `json:"id" gorm:"primaryKey"`
	UserID        string    `json:"user_id"`
	Name          string    `json:"name"`
	StreetAddress string    `json:"street_address"`
	City          string    `json:"city"`
	State         string    `json:"state"`
	ZipCode       string    `json:"zip_code"`
	Country       string    `json:"country"`
	CreatedAt     time.Time `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt     time.Time `gorm:"autoUpdateTime" json:"updated_at"`
}

func (ShippingAddress) TableName() string {
	return "shipping_address"
}
