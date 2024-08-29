package service

import (
	"encoding/json"
	"fmt"
	"io"
	"jiffy/model"
	"jiffy/utils"
	"net/http"
)

var SentinelURL = "https://sentinel-api.gauchoracing.com"

type SentinelError struct {
	Code    int
	Message string `json:"message"`
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
