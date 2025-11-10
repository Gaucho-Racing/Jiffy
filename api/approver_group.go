package api

import (
	"jiffy/model"
	"jiffy/service"
	"net/http"

	"github.com/gin-gonic/gin"
)

func GetAllApproverGroups(c *gin.Context) {
	approverGroups, err := service.GetAllApproverGroups()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, approverGroups)
}

func GetApproverGroup(c *gin.Context) {
	id := c.Param("id")
	approverGroup, err := service.GetApproverGroup(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "approver group not found"})
		return
	}
	c.JSON(http.StatusOK, approverGroup)
}

func CreateApproverGroup(c *gin.Context) {
	userID := GetRequestUserID(c)
	user, err := service.GetUser(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if !user.IsInnerCircle() {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only inner circle members can create approver groups"})
		return
	}

	var approverGroup model.ApproverGroup
	if err := c.ShouldBindJSON(&approverGroup); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	approverGroup, err = service.CreateApproverGroup(approverGroup)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, approverGroup)
}

func DeleteApproverGroup(c *gin.Context) {
	id := c.Param("id")

	userID := GetRequestUserID(c)
	user, err := service.GetUser(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	if !user.IsInnerCircle() {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only inner circle members can delete approver groups"})
		return
	}

	err = service.DeleteApproverGroup(id)
	if err != nil {
		if err.Error() == "approver group not found" {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Approver group deleted"})
}
