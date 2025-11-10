package api

import (
	"jiffy/model"
	"jiffy/service"
	"net/http"

	"github.com/gin-gonic/gin"
)

func CreateShippingAddress(c *gin.Context) {
	var address model.ShippingAddress
	if err := c.ShouldBindJSON(&address); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	createdAddress, err := service.CreateShippingAddress(address, GetRequestUserID(c))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, createdAddress)
}

func DeleteShippingAddress(c *gin.Context) {
	addressID := c.Param("id")

	if err := service.DeleteShippingAddress(addressID, GetRequestUserID(c)); err != nil {
		if err.Error() == "you are not the owner of this shipping address" {
			c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
			return
		}
		if err.Error() == "shipping address not found" {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Shipping address deleted successfully"})
}

func GetShippingAddresses(c *gin.Context) {
	addresses, err := service.GetShippingAddressesByUserID(GetRequestUserID(c))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, addresses)
}
