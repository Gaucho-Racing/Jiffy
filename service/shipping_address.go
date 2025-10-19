package service

import (
	"errors"
	"jiffy/database"
	"jiffy/model"
	"jiffy/utils"
)

// CreateShippingAddress creates a new shipping address for a user
func CreateShippingAddress(address model.ShippingAddress, userID string) (model.ShippingAddress, error) {
	address.UserID = userID
	if address.Name == "" {
		return model.ShippingAddress{}, errors.New("address name cannot be empty")
	}
	if address.StreetAddress == "" {
		return model.ShippingAddress{}, errors.New("street address cannot be empty")
	}
	if address.City == "" {
		return model.ShippingAddress{}, errors.New("city cannot be empty")
	}
	if address.State == "" {
		return model.ShippingAddress{}, errors.New("state cannot be empty")
	}
	if address.ZipCode == "" {
		return model.ShippingAddress{}, errors.New("zip code cannot be empty")
	}
	if address.Country == "" {
		return model.ShippingAddress{}, errors.New("country cannot be empty")
	}

	if result := database.DB.Create(&address); result.Error != nil {
		utils.SugarLogger.Errorf("Error creating shipping address: %v", result.Error)
		return model.ShippingAddress{}, result.Error
	}

	utils.SugarLogger.Infof("Shipping address created with ID: %d for user: %s", address.ID, address.UserID)
	return address, nil
}

// DeleteShippingAddress deletes a shipping address by ID
func DeleteShippingAddress(addressID int, userID string) error {
	if addressID <= 0 {
		return errors.New("invalid address ID")
	}
	if userID == "" {
		return errors.New("user ID cannot be empty")
	}

	// Verify ownership before deletion
	var address model.ShippingAddress
	if err := database.DB.Where("id = ? AND user_id = ?", addressID, userID).First(&address).Error; err != nil {
		utils.SugarLogger.Errorf("Error finding shipping address %d for user %s: %v", addressID, userID, err)
		return errors.New("shipping address not found or access denied")
	}

	if err := database.DB.Delete(&address).Error; err != nil {
		utils.SugarLogger.Errorf("Error deleting shipping address %d: %v", addressID, err)
		return err
	}

	utils.SugarLogger.Infof("Shipping address %d deleted for user %s", addressID, userID)
	return nil
}

// GetShippingAddressByID retrieves a shipping address by ID
func GetShippingAddressByID(addressID int) (model.ShippingAddress, error) {
	if addressID <= 0 {
		return model.ShippingAddress{}, errors.New("invalid address ID")
	}

	var address model.ShippingAddress
	if err := database.DB.Where("id = ?", addressID).First(&address).Error; err != nil {
		utils.SugarLogger.Errorf("Error getting shipping address %d: %v", addressID, err)
		return model.ShippingAddress{}, errors.New("shipping address not found")
	}

	return address, nil
}

// GetShippingAddressesByUserID retrieves all shipping addresses for a user
func GetShippingAddressesByUserID(userID string) ([]model.ShippingAddress, error) {
	if userID == "" {
		return nil, errors.New("user ID cannot be empty")
	}

	var addresses []model.ShippingAddress
	if err := database.DB.Where("user_id = ?", userID).Order("created_at DESC").Find(&addresses).Error; err != nil {
		utils.SugarLogger.Errorf("Error getting shipping addresses for user %s: %v", userID, err)
		return nil, err
	}

	return addresses, nil
}
