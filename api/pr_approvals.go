package api

import (
	"jiffy/model"
	"jiffy/service"
	"net/http"

	"github.com/gin-gonic/gin"
)

func EditApproval(c *gin.Context) {
	approvalID := c.Param("approvalID")

	var request struct {
		Status string `json:"status" binding:"required"`
		Note   string `json:"note"   binding:"required"`
	}
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	result, err := service.EditApproval(approvalID, model.ApprovalStatus(request.Status), request.Note, GetRequestUserID(c))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, result)
}
