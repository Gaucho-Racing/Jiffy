package api

import (
	"jiffy/service"
	"net/http"

	"github.com/gin-gonic/gin"
)

func PopulateSheets(c *gin.Context) {
	service.PopulateGR26PurchaseRequestsSheet()
	c.JSON(http.StatusOK, gin.H{"message": "Sheets populated successfully"})
}
