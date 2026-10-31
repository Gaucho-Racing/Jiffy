package api

import (
	"jiffy/service"
	"net/http"

	"github.com/gin-gonic/gin"
)

func SearchUsers(c *gin.Context) {
	if GetRequestUserID(c) == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "Sign in to search people"})
		return
	}
	users, err := service.SearchDirectory(GetRequestToken(c), c.Query("q"), 6)
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"message": "People search is unavailable right now"})
		return
	}
	c.JSON(http.StatusOK, users)
}

func GetUser(c *gin.Context) {
	user, err := service.GetUser(c.Param("userID"), GetRequestToken(c))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, user)
}

func GetCurrentUser(c *gin.Context) {
	Require(c, GetRequestUserID(c) != "")
	user, err := service.GetCurrentUser(c.GetString("Auth-Token"), GetRequestUserID(c))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, user)
}
