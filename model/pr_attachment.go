package model

import "time"

type AttachmentType string

const (
	AttachmentReceipt      AttachmentType = "Receipt"
	AttachmentCheckoutPage AttachmentType = "Checkout Page"
	AttachmentInvoice      AttachmentType = "Invoice"
	AttachmentQuote        AttachmentType = "Quote"
	AttachmentOther        AttachmentType = "Other"
)

type PurchaseRequestAttachment struct {
	ID                string         `json:"id" gorm:"primaryKey"`
	PurchaseRequestID int            `json:"purchase_request_id"`
	UserID            string         `json:"user_id"`
	User              User           `json:"user" gorm:"-"`
	URL               string         `json:"url"`
	Filename          string         `json:"filename"`
	FileSize          int64          `json:"file_size"`
	ContentType       string         `json:"content_type"`
	Type              AttachmentType `json:"type" form:"type"`
	Description       string         `json:"description" form:"description"`
	CreatedAt         time.Time      `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt         time.Time      `gorm:"autoUpdateTime" json:"updated_at"`
}

func (PurchaseRequestAttachment) TableName() string {
	return "purchase_request_attachment"
}
