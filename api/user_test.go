package api

import (
	"encoding/json"
	"jiffy/config"
	"jiffy/model"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

func TestGetAllUsers(t *testing.T) {
	gin.SetMode(gin.TestMode)

	t.Run("Success", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)

		GetAllUsers(c)

		assert.Equal(t, http.StatusOK, w.Code)
		var response []model.User
		err := json.Unmarshal(w.Body.Bytes(), &response)
		assert.NoError(t, err)
		assert.NotEmpty(t, response)
		for _, user := range response {
			assert.NotEmpty(t, user.ID)
			assert.NotEmpty(t, user.Email)
		}
	})

	t.Run("Unauthorized", func(t *testing.T) {
		originalToken := config.Sentinel.Token
		config.Sentinel.Token = "invalid_token"

		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)

		GetAllUsers(c)

		assert.Equal(t, http.StatusInternalServerError, w.Code)

		config.Sentinel.Token = originalToken
	})
}

func TestGetUser(t *testing.T) {
	gin.SetMode(gin.TestMode)

	t.Run("Success", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Params = gin.Params{{Key: "userID", Value: "1258902460999667887"}}

		GetUser(c)

		assert.Equal(t, http.StatusOK, w.Code)
		var response model.User
		err := json.Unmarshal(w.Body.Bytes(), &response)
		assert.NoError(t, err)
		assert.Equal(t, "1258902460999667887", response.ID)
		assert.NotEmpty(t, response.Email)
	})

	t.Run("User Not Found", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Params = gin.Params{{Key: "userID", Value: "non_existent_user_id"}}

		GetUser(c)

		assert.Equal(t, http.StatusInternalServerError, w.Code)
	})
}

func TestGetCurrentUser(t *testing.T) {
	gin.SetMode(gin.TestMode)

	t.Run("Success", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Set("Auth-Token", config.Sentinel.Token)

		GetCurrentUser(c)

		assert.Equal(t, http.StatusOK, w.Code)
		var response model.User
		err := json.Unmarshal(w.Body.Bytes(), &response)
		assert.NoError(t, err)
		assert.NotEmpty(t, response.ID)
		assert.NotEmpty(t, response.Email)
	})

	t.Run("Unauthorized", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Set("Auth-Token", "invalid_token")

		GetCurrentUser(c)

		assert.Equal(t, http.StatusInternalServerError, w.Code)
	})
}
