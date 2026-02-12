package api

import (
	"jiffy/model"
	"jiffy/service"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

func GetAllPurchaseRequests(c *gin.Context) {
	prs := service.GetAllPurchaseRequests()
	c.JSON(http.StatusOK, prs)
}

func GetPurchaseRequestByID(c *gin.Context) {
	idString := c.Param("id")
	id, err := strconv.Atoi(idString)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid purchase request ID"})
		return
	}
	pr := service.GetPurchaseRequestByID(id, GetRequestUserID(c))
	if pr.ID == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Purchase request not found"})
		return
	}
	c.JSON(http.StatusOK, pr)
}

func CreatePurchaseRequest(c *gin.Context) {
	var pr model.PurchaseRequest
	if err := c.ShouldBindJSON(&pr); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	updatedPR, err := service.CreatePurchaseRequest(pr, GetRequestUserID(c))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, updatedPR)
}

func UpdatePurchaseRequestFields(c *gin.Context) {
	idString := c.Param("id")
	id, err := strconv.Atoi(idString)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}

	var request struct {
		Component             *string    `json:"component"`
		Vendor                *string    `json:"vendor"`
		Priority              *int       `json:"priority"`
		NeededByDate          *time.Time `json:"needed_by_date"`
		Description           *string    `json:"description"`
		ReimbursementType     *string    `json:"reimbursement_type"`
		FinalCostCents        *int       `json:"final_cost_cents"`
		RequestedPurchaser    *string    `json:"requested_purchaser"`
		PlacedOrderUnapproved *bool      `json:"placed_order_unapproved"`
	}
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	updates := map[string]interface{}{}
	if request.Component != nil {
		updates["component"] = *request.Component
	}
	if request.Vendor != nil {
		updates["vendor"] = *request.Vendor
	}
	if request.Priority != nil {
		updates["priority"] = *request.Priority
	}
	if request.NeededByDate != nil {
		updates["needed_by_date"] = *request.NeededByDate
	}
	if request.Description != nil {
		updates["description"] = *request.Description
	}
	if request.ReimbursementType != nil {
		updates["reimbursement_type"] = *request.ReimbursementType
	}
	if request.FinalCostCents != nil {
		updates["final_cost_cents"] = *request.FinalCostCents
	}
	if request.RequestedPurchaser != nil {
		updates["requested_purchaser"] = *request.RequestedPurchaser
	}
	if request.PlacedOrderUnapproved != nil {
		updates["placed_order_unapproved"] = *request.PlacedOrderUnapproved
	}

	if len(updates) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No fields provided"})
		return
	}

	result, err := service.UpdatePurchaseRequestFields(id, GetRequestUserID(c), updates)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, result)
}

func UpdatePurchaseRequestStatus(c *gin.Context) {
	idString := c.Param("id")
	id, err := strconv.Atoi(idString)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}
	var request struct {
		Status model.PurchaseRequestStatus `json:"status" binding:"required"`
		Note   string                      `json:"note"`
	}
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	result, err := service.UpdatePurchaseRequestStatus(id, request.Status, request.Note, GetRequestUserID(c))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, result)
}

func DeletePurchaseRequest(c *gin.Context) {
	idString := c.Param("id")
	id, err := strconv.Atoi(idString)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid purchase request ID"})
		return
	}
	existingPR := service.GetPurchaseRequestByID(id, GetRequestUserID(c))
	if existingPR.ID == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Purchase request not found"})
		return
	}
	userID := GetRequestUserID(c)
	user, err := service.GetUser(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	if existingPR.UserID != userID && !user.IsAdmin() {
		c.JSON(http.StatusForbidden, gin.H{"error": "You can only delete your own purchase requests"})
		return
	}
	if existingPR.Status != model.PurchaseRequestPending && existingPR.Status != model.PurchaseRequestRejected {
		c.JSON(http.StatusForbidden, gin.H{"error": "Cannot delete purchase request in current status"})
		return
	}
	if err := service.DeletePurchaseRequest(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Purchase request deleted successfully"})
}
