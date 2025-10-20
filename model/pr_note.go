package model

import "time"

type PurchaseRequestNote struct {
	ID                int       `json:"id" gorm:"primaryKey;autoIncrement"`
	PurchaseRequestID int       `json:"purchase_request_id"`
	UserID            string    `json:"user_id"`
	User              User      `json:"user" gorm:"-"`
	Type              NoteType  `json:"type"`
	Note              string    `json:"note"`
	CreatedAt         time.Time `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt         time.Time `gorm:"autoUpdateTime" json:"updated_at"`
}

func (PurchaseRequestNote) TableName() string {
	return "purchase_request_note"
}

type NoteType string

const (
	NoteRequestSubmitted   NoteType = "Request Submitted"
	NoteApproved           NoteType = "Approved"
	NoteRejected           NoteType = "Rejected"
	NoteStatusChanged      NoteType = "Status Changed"
	NoteRequestAmended     NoteType = "Request Amended"
	NoteComment            NoteType = "Comment"
	NoteAttachmentUploaded NoteType = "Attachment Uploaded"
	NoteAttachmentDeleted  NoteType = "Attachment Deleted"
)
