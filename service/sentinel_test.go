package service

import (
	"encoding/json"
	"jiffy/config"
	"net/http"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestPingSentinel(t *testing.T) {
	result := PingSentinel()
	assert.True(t, result, "Sentinel should be reachable")
}

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

func TestExchangeCodeForToken(t *testing.T) {
	t.Run("Valid Code", func(t *testing.T) {
		code := getAuthorizationCode()
		token, err := ExchangeCodeForToken(code)

		assert.NoError(t, err)
		assert.NotEmpty(t, token.AccessToken)
		assert.Equal(t, "Bearer", token.TokenType)
		assert.Greater(t, token.ExpiresIn, 0)
		assert.NotEmpty(t, token.Scope)
	})

	t.Run("Invalid Code", func(t *testing.T) {
		_, err := ExchangeCodeForToken("invalid_code")
		assert.Error(t, err)
	})
}

func TestGetAllUsers(t *testing.T) {
	users, err := GetAllUsers()

	assert.NoError(t, err)
	assert.NotEmpty(t, users)
	for _, user := range users {
		assert.NotEmpty(t, user.ID)
		assert.NotEmpty(t, user.Email)
	}

	// Test with invalid token
	originalToken := config.Sentinel.Token
	config.Sentinel.Token = "invalid_token"
	_, err = GetAllUsers()
	assert.Error(t, err)
	config.Sentinel.Token = originalToken
}

func TestGetUser(t *testing.T) {
	knownUserID := "1258902460999667887"
	user, err := GetUser(knownUserID)

	assert.NoError(t, err)
	assert.Equal(t, knownUserID, user.ID)
	assert.NotEmpty(t, user.Email)

	// Test with non-existent user ID
	_, err = GetUser("non_existent_user_id")
	assert.Error(t, err)
}

func TestGetCurrentUser(t *testing.T) {
	user, err := GetCurrentUser(config.Sentinel.Token)

	assert.NoError(t, err)
	assert.NotEmpty(t, user.ID)
	assert.NotEmpty(t, user.Email)

	// Test with invalid token
	_, err = GetCurrentUser("invalid_token")
	assert.Error(t, err)
}
