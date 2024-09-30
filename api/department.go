package api

import (
	"jiffy/model"
	"jiffy/service"
	"net/http"

	"github.com/gin-gonic/gin"
)

func GetAllDepartments(c *gin.Context) {
	departments, err := service.GetAllDepartments()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, departments)
}

func GetDepartmentByID(c *gin.Context) {
	id := c.Param("departmentID")
	department, err := service.GetDepartmentByID(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, department)
}

func CreateDepartment(c *gin.Context) {
	var department model.Department
	if err := c.ShouldBindJSON(&department); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	department, err := service.CreateDepartment(department)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, department)
}

func AddApproverToDepartment(c *gin.Context) {
	departmentID := c.Param("departmentID")
	approverID := c.Param("approverID")
	err := service.AddApproverToDepartment(departmentID, approverID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Approver added to department"})
}

func RemoveApproverFromDepartment(c *gin.Context) {
	departmentID := c.Param("departmentID")
	approverID := c.Param("approverID")
	err := service.RemoveApproverFromDepartment(departmentID, approverID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Approver removed from department"})
}

func AddBudgetToDepartment(c *gin.Context) {
	departmentID := c.Param("departmentID")
	var budget model.DepartmentBudget
	if err := c.ShouldBindJSON(&budget); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	budget.DepartmentID = departmentID
	createdBudget, err := service.AddBudgetToDepartment(departmentID, budget)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, createdBudget)
}

func RemoveBudgetFromDepartment(c *gin.Context) {
	departmentID := c.Param("departmentID")
	budgetID := c.Param("budgetID")
	err := service.RemoveBudgetFromDepartment(departmentID, budgetID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Budget removed from department"})
}
