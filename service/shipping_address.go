package service

import (
	"errors"
	"jiffy/database"
	"jiffy/model"
	"jiffy/utils"

	"github.com/google/uuid"
)

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
	if address.ID == "" {
		address.ID = uuid.New().String()
	} else {
		existingAddress, _ := GetShippingAddressByID(address.ID)
		if existingAddress.UserID != userID {
			return model.ShippingAddress{}, errors.New("you are not the owner of this shipping address")
		}
	}
	if database.DB.Where("id = ?", address.ID).Updates(&address).RowsAffected == 0 {
		utils.SugarLogger.Infoln("New shipping address created with id: " + address.ID)
		if result := database.DB.Create(&address); result.Error != nil {
			return model.ShippingAddress{}, result.Error
		}
	} else {
		utils.SugarLogger.Infoln("Shipping address with id: " + address.ID + " has been updated!")
	}
	return address, nil
}

func DeleteShippingAddress(addressID string, userID string) error {
	if userID == "" {
		return errors.New("user ID cannot be empty")
	}
	address, err := GetShippingAddressByID(addressID)
	if err != nil {
		return errors.New("shipping address not found")
	}
	if address.UserID != userID {
		return errors.New("you are not the owner of this shipping address")
	}

	if err := database.DB.Delete(&address).Error; err != nil {
		utils.SugarLogger.Errorf("Error deleting shipping address %s: %v", addressID, err)
		return err
	}

	utils.SugarLogger.Infof("Shipping address %s deleted for user %s", addressID, userID)
	return nil
}

// GetShippingAddressByID retrieves a shipping address by ID
func GetShippingAddressByID(addressID string) (model.ShippingAddress, error) {
	var address model.ShippingAddress
	if err := database.DB.Where("id = ?", addressID).First(&address).Error; err != nil {
		utils.SugarLogger.Errorf("Error getting shipping address %s: %v", addressID, err)
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
