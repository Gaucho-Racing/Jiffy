package service

import (
	"jiffy/database"
	"jiffy/model"
	"jiffy/utils"

	"github.com/google/uuid"
)

func GetNotesForPR(prID int) ([]model.PurchaseRequestNote, error) {
	var notes []model.PurchaseRequestNote
	result := database.DB.Where("purchase_request_id = ?", prID).Order("created_at DESC").Find(&notes)
	if result.Error != nil {
		utils.SugarLogger.Errorf("Error fetching notes for PR %d: %v", prID, result.Error)
		return nil, result.Error
	}

	for i := range notes {
		notes[i].User, _ = GetUser(notes[i].UserID, "")
	}

	return notes, nil
}

func CreateNote(prID int, noteType model.NoteType, userID string, message string) (model.PurchaseRequestNote, error) {
	note := model.PurchaseRequestNote{
		ID:                uuid.New().String(),
		PurchaseRequestID: prID,
		Type:              noteType,
		UserID:            userID,
		Note:              message,
	}
	if noteType == model.NoteComment {
		note.Note = "Comment made: '" + message + "'"
	}

	if result := database.DB.Create(&note); result.Error != nil {
		utils.SugarLogger.Errorf("Error creating note: %v", result.Error)
		return model.PurchaseRequestNote{}, result.Error
	}

	utils.SugarLogger.Infof("Note created (type: %s) for PR %d by user %s", noteType, prID, userID)
	return note, nil
}
