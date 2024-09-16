package model

import "time"

type PurchaseRequest struct {
	ID            string                  `json:"id" gorm:"primaryKey"`
	DepartmentID  string                  `json:"department_id"`
	UserID        string                  `json:"user_id"`
	Status        []PurchaseRequestStatus `json:"status" gorm:"-"`
	ItemName      string                  `json:"item_name"`
	ItemPrice     int                     `json:"item_price"`
	ItemQuantity  int                     `json:"item_quantity"`
	ItemURL       string                  `json:"item_url"`
	EstimatedCost int                     `json:"estimated_cost"`
	FinalCost     int                     `json:"final_cost"`
	Description   string                  `json:"description"`
	Priority      int                     `json:"priority"`
	UpdatedAt     time.Time               `gorm:"autoUpdateTime" json:"updated_at"`
	CreatedAt     time.Time               `gorm:"autoCreateTime" json:"created_at"`
}

func (PurchaseRequest) TableName() string {
	return "purchase_request"
}

type PurchaseRequestStatus struct {
	ID        string    `json:"id" gorm:"primaryKey"`
	Status    string    `json:"status"`
	UserID    string    `json:"user_id"`
	Note      string    `json:"note"`
	CreatedAt time.Time `json:"created_at" gorm:"autoCreateTime"`
}

func (PurchaseRequestStatus) TableName() string {
	return "purchase_request_status"
}
