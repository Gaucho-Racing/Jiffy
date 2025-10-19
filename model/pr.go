package model

import "time"

type PurchaseRequest struct {
	ID                   int                       `json:"id" gorm:"primaryKey;autoIncrement"`
	DepartmentID         string                    `json:"department_id"`
	Component            string                    `json:"component"`
	UserID               string                    `json:"user_id"`
	User                 User                      `json:"user" gorm:"-"`
	Status               PurchaseRequestStatus     `json:"status"`
	Approvals            []PurchaseRequestApproval `json:"approvals" gorm:"foreignKey:PurchaseRequestID"`
	Items                []PurchaseRequestItem     `json:"items" gorm:"foreignKey:PurchaseRequestID"`
	Vendor               string                    `json:"vendor"`
	ShippingTaxCostCents int                       `json:"shipping_tax_cost_cents"`
	EstimatedCostCents   int                       `json:"estimated_cost_cents"`
	FinalCostCents       int                       `json:"final_cost_cents"`
	Description          string                    `json:"description"`
	Priority             int                       `json:"priority"`
	NeededByDate         time.Time                 `json:"needed_by_date"`
	RequestedPurchaser   string                    `json:"requested_purchaser"`
	ShippingAddressID    int                       `json:"shipping_address_id"`
	ShippingAddress      ShippingAddress           `json:"shipping_address" gorm:"-"`
	UpdatedAt            time.Time                 `gorm:"autoUpdateTime" json:"updated_at"`
	CreatedAt            time.Time                 `gorm:"autoCreateTime" json:"created_at"`
}

func (PurchaseRequest) TableName() string {
	return "purchase_request"
}

type PurchaseRequestStatus string

const (
	PurchaseRequestPending   PurchaseRequestStatus = "Pending Approval"
	PurchaseRequestApproved  PurchaseRequestStatus = "Request Approved"
	PurchaseRequestRejected  PurchaseRequestStatus = "Request Rejected"
	PurchaseRequestOrdered   PurchaseRequestStatus = "Order Placed"
	PurchaseRequestDelivered PurchaseRequestStatus = "Order Delivered"
	PurchaseRequestCollected PurchaseRequestStatus = "Order Collected"
)
