package api

import (
	"bytes"
	"encoding/json"
	"jiffy/config"
	"jiffy/service"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

func getAuthorizationCode() string {
	url := config.Sentinel.Url + "/oauth/authorize"
	params := map[string]string{
		"client_id":     config.Sentinel.ClientID,
		"redirect_uri":  config.Sentinel.RedirectURI,
		"scope":         "user:read",
		"response_type": "code",
	}

	req, err := http.NewRequest("POST", url, nil)
	if err != nil {
		return ""
	}

	req.Header.Set("Authorization", "Bearer "+config.Sentinel.Token)

	q := req.URL.Query()
	for key, value := range params {
		q.Add(key, value)
	}
	req.URL.RawQuery = q.Encode()

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return ""
	}
	defer resp.Body.Close()

	var authCode struct {
		Code string `json:"code"`
	}

	err = json.NewDecoder(resp.Body).Decode(&authCode)
	if err != nil {
		return ""
	}

	return authCode.Code
}

func TestLogin(t *testing.T) {
	gin.SetMode(gin.TestMode)

	t.Run("Valid Code", func(t *testing.T) {
		// Get a valid authorization code
		code := getAuthorizationCode()
		assert.NotEmpty(t, code, "Failed to get a valid authorization code")

		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)

		body := bytes.NewBufferString(`{"code": "` + code + `"}`)
		c.Request, _ = http.NewRequest("POST", "/auth/login", body)
		c.Request.Header.Set("Content-Type", "application/json")

		Login(c)

		assert.Equal(t, http.StatusOK, w.Code)
		var response service.SentinelTokenResponse
		err := json.Unmarshal(w.Body.Bytes(), &response)
		assert.NoError(t, err)
		assert.NotEmpty(t, response.AccessToken)
		assert.Equal(t, "Bearer", response.TokenType)
	})

	t.Run("Invalid Request Body", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)

		c.Request, _ = http.NewRequest("POST", "/auth/login", nil)
		c.Request.Header.Set("Content-Type", "application/json")

		Login(c)

		assert.Equal(t, http.StatusBadRequest, w.Code)
	})

	t.Run("Empty Code", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)

		body := bytes.NewBufferString(`{"code": ""}`)
		c.Request, _ = http.NewRequest("POST", "/auth/login", body)
		c.Request.Header.Set("Content-Type", "application/json")

		Login(c)

		assert.Equal(t, http.StatusBadRequest, w.Code)
	})

	t.Run("Invalid Code", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)

		body := bytes.NewBufferString(`{"code": "invalid_code"}`)
		c.Request, _ = http.NewRequest("POST", "/auth/login", body)
		c.Request.Header.Set("Content-Type", "application/json")

		Login(c)

		assert.Equal(t, http.StatusInternalServerError, w.Code)
	})
}
