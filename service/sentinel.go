package service

import (
	"encoding/json"
	"fmt"
	"io"
	"jiffy/model"
	"jiffy/utils"
	"net/http"
	"net/url"
	"os"
)

var SentinelURL = "https://sentinel-api.gauchoracing.com"
var SentinelClientID = os.Getenv("SENTINEL_CLIENT_ID")
var SentinelClientSecret = os.Getenv("SENTINEL_CLIENT_SECRET")
var SentinelRedirectURI = os.Getenv("SENTINEL_REDIRECT_URI")

type SentinelError struct {
	Code    int
	Message string `json:"message"`
}

type SentinelTokenResponse struct {
	AccessToken  string `json:"access_token,omitempty"`
	RefreshToken string `json:"refresh_token,omitempty"`
	TokenType    string `json:"token_type,omitempty"`
	ExpiresIn    int    `json:"expires_in,omitempty"`
	Scope        string `json:"scope,omitempty"`
}

func PingSentinel() bool {
	resp, err := http.Get(SentinelURL + "/ping")
	if err != nil {
		utils.SugarLogger.Errorln("Failed to ping sentinel:", err)
		return false
	}
	defer resp.Body.Close()

	return resp.StatusCode == http.StatusOK
}

func ExchangeCodeForToken(code string) (SentinelTokenResponse, error) {
	resp, err := http.PostForm(SentinelURL+"/oauth2/token", url.Values{
		"grant_type":    {"authorization_code"},
		"client_id":     {SentinelClientID},
		"client_secret": {SentinelClientSecret},
		"code":          {code},
		"redirect_uri":  {SentinelRedirectURI},
	})
	if err != nil {
		utils.SugarLogger.Errorln("Failed to exchange code for token:", err)
		return SentinelTokenResponse{}, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		utils.SugarLogger.Errorln("Failed to read token response body:", err)
		return SentinelTokenResponse{}, err
	}
	utils.SugarLogger.Infof("Response body: %s", string(body))

	if resp.StatusCode != http.StatusOK {
		var sentinelErr SentinelError
		if err := json.Unmarshal(body, &sentinelErr); err != nil {
			utils.SugarLogger.Errorln("Failed to unmarshal sentinel error:", err)
			return SentinelTokenResponse{}, err
		}
		sentinelErr.Code = resp.StatusCode
		return SentinelTokenResponse{}, fmt.Errorf("sentinel error: [%d] %s", sentinelErr.Code, sentinelErr.Message)
	}

	var tokenResponse SentinelTokenResponse
	if err := json.Unmarshal(body, &tokenResponse); err != nil {
		utils.SugarLogger.Errorln("Failed to unmarshal token response:", err)
		return SentinelTokenResponse{}, err
	}
	return tokenResponse, nil
}

func GetAllUsers() ([]model.User, error) {
	resp, err := http.Get(SentinelURL + "/users")
	if err != nil {
		utils.SugarLogger.Errorln("Failed to get users from sentinel:", err)
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		utils.SugarLogger.Errorln("Failed to read users from sentinel:", err)
		return nil, err
	}
	utils.SugarLogger.Infof("Response body: %s", string(body))

	if resp.StatusCode != http.StatusOK {
		var sentinelErr SentinelError
		if err := json.Unmarshal(body, &sentinelErr); err != nil {
			utils.SugarLogger.Errorln("Failed to unmarshal sentinel error:", err)
			return nil, err
		}
		sentinelErr.Code = resp.StatusCode
		return nil, fmt.Errorf("sentinel error: [%d] %s", sentinelErr.Code, sentinelErr.Message)
	}

	var users []model.User
	if err := json.Unmarshal(body, &users); err != nil {
		utils.SugarLogger.Errorln("Failed to unmarshal users from sentinel:", err)
		return nil, err
	}

	return users, nil
}

func GetUser(id string) (model.User, error) {
	resp, err := http.Get(SentinelURL + "/users/" + id)
	if err != nil {
		utils.SugarLogger.Errorln("Failed to get user from sentinel:", err)
		return model.User{}, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		utils.SugarLogger.Errorln("Failed to read user from sentinel:", err)
		return model.User{}, err
	}
	utils.SugarLogger.Infof("Response body: %s", string(body))

	if resp.StatusCode != http.StatusOK {
		var sentinelErr SentinelError
		if err := json.Unmarshal(body, &sentinelErr); err != nil {
			utils.SugarLogger.Errorln("Failed to unmarshal sentinel error:", err)
			return model.User{}, err
		}
		sentinelErr.Code = resp.StatusCode
		return model.User{}, fmt.Errorf("sentinel error: [%d] %s", sentinelErr.Code, sentinelErr.Message)
	}

	var user model.User
	if err := json.Unmarshal(body, &user); err != nil {
		utils.SugarLogger.Errorln("Failed to unmarshal user from sentinel:", err)
		return model.User{}, err
	}

	return user, nil
}
