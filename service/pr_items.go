package service

import (
	"jiffy/database"
	"jiffy/model"
	"jiffy/utils"
)

// calculateEstimatedCost calculates the total cost from all items (excluding shipping)
func calculateEstimatedCost(items []model.PurchaseRequestItem) int {
	total := 0
	for _, item := range items {
		total += item.ItemUnitPriceCents * item.ItemQuantity
	}
	return total
}

// CreatePurchaseRequestItem creates a new purchase request item
func CreatePurchaseRequestItem(item model.PurchaseRequestItem) error {
	if result := database.DB.Create(&item); result.Error != nil {
		utils.SugarLogger.Errorf("Error creating purchase request item: %v", result.Error)
		return result.Error
	}
	utils.SugarLogger.Infoln("Purchase request item created with id: %d", item.ID)
	return nil
}

// GetPurchaseRequestItems gets all items for a specific purchase request
func GetPurchaseRequestItems(prID int) []model.PurchaseRequestItem {
	var items []model.PurchaseRequestItem
	if err := database.DB.Where("purchase_request_id = ?", prID).Find(&items).Error; err != nil {
		utils.SugarLogger.Errorf("Error getting items for PR %d: %v", prID, err)
		return nil
	}
	return items
}

// DeletePurchaseRequestItems deletes all items for a specific purchase request
func DeletePurchaseRequestItems(prID int) error {
	if err := database.DB.Where("purchase_request_id = ?", prID).Delete(&model.PurchaseRequestItem{}).Error; err != nil {
		utils.SugarLogger.Errorf("Error deleting items for PR %d: %v", prID, err)
		return err
	}
	utils.SugarLogger.Infof("Successfully deleted all items for PR %d", prID)
	return nil
}
