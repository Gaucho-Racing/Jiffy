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
	id := c.Param("id")
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
