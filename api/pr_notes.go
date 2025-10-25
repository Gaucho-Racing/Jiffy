package api

import (
	"jiffy/model"
	"jiffy/service"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

func CreateNote(c *gin.Context) {
	idString := c.Param("id")
	prID, err := strconv.Atoi(idString)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid purchase request ID"})
		return
	}

	var request struct {
		Type model.NoteType `json:"type" binding:"required"`
		Note string         `json:"note" binding:"required"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	note, err := service.CreateNote(prID, request.Type, GetRequestUserID(c), request.Note)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, note)
}
