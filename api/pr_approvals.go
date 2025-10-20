package api

import (
	"jiffy/model"
	"jiffy/service"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

func EditApproval(c *gin.Context) {
	approvalIDString := c.Param("approvalID")
	approvalID, err := strconv.Atoi(approvalIDString)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid approval ID"})
		return
	}
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
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, result)
}
