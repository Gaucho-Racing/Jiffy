package service

import (
	"jiffy/database"
	"jiffy/model"
	"jiffy/utils"
	"mime/multipart"

	"github.com/google/uuid"
)

func CreateAttachment(prID int, userID string, file *multipart.FileHeader, attachment model.PurchaseRequestAttachment) (model.PurchaseRequestAttachment, error) {
	url, err := UploadFileToS3(file, prID)
	if err != nil {
		utils.SugarLogger.Errorf("Failed to upload file to S3: %v", err)
		return model.PurchaseRequestAttachment{}, err
	}

	attachment.ID = uuid.New().String()
	attachment.PurchaseRequestID = prID
	attachment.UserID = userID
	attachment.URL = url
	attachment.Filename = file.Filename
	attachment.FileSize = file.Size
	attachment.ContentType = file.Header.Get("Content-Type")

	if err := database.DB.Create(&attachment).Error; err != nil {
		utils.SugarLogger.Errorf("Failed to create attachment: %v", err)
		return model.PurchaseRequestAttachment{}, err
	}
	_, _ = CreateNote(prID, model.NoteAttachmentUploaded, userID, "Attachment uploaded: "+attachment.Filename+" - "+attachment.Description)

	return attachment, nil
}

func GetAttachmentsByPRID(prID int) ([]model.PurchaseRequestAttachment, error) {
	var attachments []model.PurchaseRequestAttachment
	if err := database.DB.Where("purchase_request_id = ?", prID).Order("created_at DESC").Find(&attachments).Error; err != nil {
		utils.SugarLogger.Errorf("Failed to get attachments for PR %d: %v", prID, err)
		return nil, err
	}

	return attachments, nil
}
