package service

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"jiffy/config"
	"jiffy/database"
	"jiffy/model"
	"jiffy/utils"
	"net/http"
	"net/url"
	"strings"
	"time"
)

// SentinelError is the error response from the sentinel API.
type SentinelError struct {
	Code    int
	Message string `json:"error"`
}

func (e SentinelError) Error() string {
	if e.Code == 0 {
		return e.Message
	}
	return fmt.Sprintf("sentinel error: [%d] %s", e.Code, e.Message)
}

// SentinelTokenResponse is the response from exchanging a code for a token.
type SentinelTokenResponse struct {
	AccessToken  string `json:"access_token,omitempty"`
	RefreshToken string `json:"refresh_token,omitempty"`
	TokenType    string `json:"token_type,omitempty"`
	ExpiresIn    int    `json:"expires_in,omitempty"`
	Scope        string `json:"scope,omitempty"`
}

var sentinelHTTPClient = &http.Client{Timeout: 10 * time.Second}

func sentinelBaseURL() string {
	return strings.TrimRight(config.Sentinel.Url, "/")
}

// PingSentinel pings the sentinel API to check if it is online.
func PingSentinel() bool {
	resp, err := sentinelHTTPClient.Get(sentinelBaseURL() + "/api/oauth/.well-known/openid-configuration")
	if err != nil {
		// Fall back to issuer discovery at root (production layout).
		resp, err = sentinelHTTPClient.Get(sentinelBaseURL() + "/.well-known/openid-configuration")
		if err != nil {
			utils.SugarLogger.Errorln("Failed to ping sentinel:", err)
			return false
		}
	}
	defer resp.Body.Close()
	utils.SugarLogger.Infof("Successfully pinged sentinel: %d", resp.StatusCode)
	return resp.StatusCode == http.StatusOK
}

// ExchangeCodeForToken exchanges an authorization code for an access token.
func ExchangeCodeForToken(code string) (SentinelTokenResponse, error) {
	form := url.Values{}
	form.Set("grant_type", "authorization_code")
	form.Set("client_id", config.Sentinel.ClientID)
	form.Set("client_secret", config.Sentinel.ClientSecret)
	form.Set("code", code)
	form.Set("redirect_uri", config.Sentinel.RedirectURI)

	req, err := http.NewRequest(http.MethodPost, sentinelBaseURL()+"/api/oauth/token", strings.NewReader(form.Encode()))
	if err != nil {
		return SentinelTokenResponse{}, err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := sentinelHTTPClient.Do(req)
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

	if resp.StatusCode != http.StatusOK {
		utils.SugarLogger.Infof("Response body: %s", string(body))
		return SentinelTokenResponse{}, parseSentinelError(resp.StatusCode, body)
	}

	var tokenResponse SentinelTokenResponse
	if err := json.Unmarshal(body, &tokenResponse); err != nil {
		utils.SugarLogger.Errorln("Failed to unmarshal token response:", err)
		return SentinelTokenResponse{}, err
	}
	if tokenResponse.AccessToken == "" {
		return SentinelTokenResponse{}, fmt.Errorf("sentinel token response did not include access token")
	}
	return tokenResponse, nil
}

// ValidateToken validates a bearer token with Sentinel and returns its claims.
func ValidateToken(token string) (map[string]interface{}, error) {
	if strings.TrimSpace(config.Sentinel.Url) == "" {
		return nil, fmt.Errorf("SENTINEL_URL is not configured")
	}
	if strings.TrimSpace(token) == "" {
		return nil, fmt.Errorf("access token is required")
	}

	payload, err := json.Marshal(map[string]string{"token": token})
	if err != nil {
		return nil, err
	}
	req, err := http.NewRequest(http.MethodPost, sentinelBaseURL()+"/api/core/token/validate", bytes.NewReader(payload))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := sentinelHTTPClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}
	if resp.StatusCode != http.StatusOK {
		return nil, parseSentinelError(resp.StatusCode, body)
	}

	var claims map[string]interface{}
	if err := json.Unmarshal(body, &claims); err != nil {
		return nil, err
	}
	return claims, nil
}

// GetAllUsers is paused — Sentinel app tokens cannot list the directory.
// Callers that depended on pickers should stay disabled.
func GetAllUsers() ([]model.User, error) {
	return []model.User{}, nil
}

// GetUser resolves display info for a stored user id from local sources only
// (unmigrated_users + user_id_migration). Live Sentinel profile reads stay on
// GetCurrentUser / @me — calling Sentinel per nested user is too slow and
// usually 401s for other users.
func GetUser(id string, accessToken string) (model.User, error) {
	_ = accessToken // kept for call-site compatibility; unused for directory reads
	users := GetUsers([]string{id}, "")
	if user, ok := users[id]; ok {
		return user, nil
	}
	if strings.TrimSpace(id) == "" {
		return model.User{}, fmt.Errorf("user id is required")
	}
	return model.User{ID: id, Groups: []string{}}, nil
}

// GetUsers batch-resolves display users for the given ids (one/two DB queries).
func GetUsers(ids []string, accessToken string) map[string]model.User {
	_ = accessToken
	out := make(map[string]model.User)
	if len(ids) == 0 {
		return out
	}

	seen := make(map[string]struct{}, len(ids))
	var discordIDs []string
	var sentinelIDs []string
	for _, id := range ids {
		id = strings.TrimSpace(id)
		if id == "" {
			continue
		}
		if _, ok := seen[id]; ok {
			continue
		}
		seen[id] = struct{}{}
		if isSentinelUserID(id) {
			sentinelIDs = append(sentinelIDs, id)
		} else {
			discordIDs = append(discordIDs, id)
		}
	}

	if len(discordIDs) > 0 {
		var rows []model.UnmigratedUser
		if err := database.DB.Where("id IN ?", discordIDs).Find(&rows).Error; err != nil {
			utils.SugarLogger.Warnf("batch unmigrated user lookup failed: %v", err)
		}
		found := make(map[string]struct{}, len(rows))
		for _, row := range rows {
			out[row.ID] = row.AsUser()
			found[row.ID] = struct{}{}
		}
		for _, id := range discordIDs {
			if _, ok := found[id]; !ok {
				out[id] = model.User{
					ID:        id,
					FirstName: "Unknown",
					LastName:  "(Unmigrated)",
					Email:     "(Unmigrated)",
					Groups:    []string{},
				}
			}
		}
	}

	if len(sentinelIDs) > 0 {
		type migratedRow struct {
			NewUserID string
			Username  string
			FirstName string
			LastName  string
		}
		var rows []migratedRow
		if err := database.DB.Table("user_id_migration").
			Select("new_user_id, username, first_name, last_name").
			Where("new_user_id IN ?", sentinelIDs).
			Find(&rows).Error; err != nil {
			utils.SugarLogger.Warnf("batch migrated user lookup failed: %v", err)
		}
		found := make(map[string]struct{}, len(rows))
		for _, row := range rows {
			out[row.NewUserID] = model.User{
				ID:        row.NewUserID,
				Username:  row.Username,
				FirstName: row.FirstName,
				LastName:  row.LastName,
				Groups:    []string{},
			}
			found[row.NewUserID] = struct{}{}
		}
		for _, id := range sentinelIDs {
			if _, ok := found[id]; !ok {
				out[id] = model.User{ID: id, Groups: []string{}}
			}
		}
	}

	return out
}

// GetCurrentUser gets the current user from Sentinel using the caller's access
// token (self-read via user:read / matching user_id claim).
func GetCurrentUser(accessToken string, userID string) (model.User, error) {
	if strings.TrimSpace(accessToken) == "" {
		return model.User{}, fmt.Errorf("access token is required")
	}
	if strings.TrimSpace(userID) == "" {
		return model.User{}, fmt.Errorf("user id is required")
	}

	req, err := http.NewRequest(http.MethodGet, sentinelBaseURL()+"/api/users/"+url.PathEscape(userID), nil)
	if err != nil {
		utils.SugarLogger.Errorln("Failed to create request for user:", err)
		return model.User{}, err
	}
	req.Header.Set("Authorization", "Bearer "+accessToken)

	resp, err := sentinelHTTPClient.Do(req)
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

	if resp.StatusCode != http.StatusOK {
		utils.SugarLogger.Infof("Response body: %s", string(body))
		return model.User{}, parseSentinelError(resp.StatusCode, body)
	}

	var user model.User
	if err := json.Unmarshal(body, &user); err != nil {
		utils.SugarLogger.Errorln("Failed to unmarshal user from sentinel:", err)
		return model.User{}, err
	}
	if user.Groups == nil {
		user.Groups = []string{}
	}
	return user, nil
}

func parseSentinelError(statusCode int, body []byte) error {
	var sentinelErr SentinelError
	if err := json.Unmarshal(body, &sentinelErr); err != nil || sentinelErr.Message == "" {
		trimmed := strings.TrimSpace(string(body))
		if len(trimmed) > 180 {
			trimmed = trimmed[:180] + "..."
		}
		if trimmed == "" {
			trimmed = http.StatusText(statusCode)
		}
		return fmt.Errorf("sentinel error: [%d] %s", statusCode, trimmed)
	}
	sentinelErr.Code = statusCode
	return sentinelErr
}

func isSentinelUserID(id string) bool {
	return strings.HasPrefix(id, "usr_")
}
