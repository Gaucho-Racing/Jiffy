package api

import (
	"jiffy/model"
	"jiffy/service"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

func UploadAttachment(c *gin.Context) {
	prIDString := c.Param("id")
	prID, err := strconv.Atoi(prIDString)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid purchase request ID"})
		return
	}

	userID := GetRequestUserID(c)
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "Unauthorized"})
		return
	}

	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No file provided"})
		return
	}

	const maxFileSize = 10 << 20 // 10MB
	if file.Size > maxFileSize {
		c.JSON(http.StatusBadRequest, gin.H{"error": "File size exceeds 10MB limit"})
		return
	}

	var attachment model.PurchaseRequestAttachment
	if err := c.ShouldBind(&attachment); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	result, err := service.CreateAttachment(prID, userID, file, attachment)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, result)
}

func GetAttachments(c *gin.Context) {
	prIDString := c.Param("id")
	prID, err := strconv.Atoi(prIDString)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid purchase request ID"})
		return
	}

	attachments, err := service.GetAttachmentsByPRID(prID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, attachments)
}
