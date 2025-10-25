package api

import (
	"jiffy/model"
	"jiffy/service"
	"net/http"
	"strconv"

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
	addressIDString := c.Param("id")
	addressID, err := strconv.Atoi(addressIDString)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid address ID"})
		return
	}

	if err := service.DeleteShippingAddress(addressID, GetRequestUserID(c)); err != nil {
		if err.Error() == "shipping address not found or access denied" {
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
