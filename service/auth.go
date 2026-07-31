package service

import (
	"fmt"
	"jiffy/utils"
)

// InitializeKeys is retained for startup compatibility. Token validation is
// performed remotely via Sentinel's /api/core/token/validate endpoint.
func InitializeKeys() {
	utils.SugarLogger.Infoln("Using Sentinel remote token validation")
}

// ValidateJWT validates a bearer token with Sentinel and returns a claims map.
// Kept for callers that still expect this name; prefer ValidateToken directly.
func ValidateJWT(token string) (map[string]interface{}, error) {
	claims, err := ValidateToken(token)
	if err != nil {
		utils.SugarLogger.Errorln(err.Error())
		return nil, err
	}
	if claims == nil {
		return nil, fmt.Errorf("sentinel token validate returned empty claims")
	}
	return claims, nil
}
