package api

import (
	"jiffy/config"
	"net/http"

	"github.com/gin-gonic/gin"
)

func Ping(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"message": "Jiffy v" + config.Version + " is online!"})
}
