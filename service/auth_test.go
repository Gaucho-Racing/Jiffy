package service

import (
	"jiffy/config"
	"jiffy/model"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestValidateJWT(t *testing.T) {
	testCases := []struct {
		name           string
		token          string
		expectedClaims *model.AuthClaims
		expectedError  string
	}{
		{
			name:  "Valid token",
			token: config.Sentinel.Token,
			expectedClaims: &model.AuthClaims{
				Scope: "sentinel:all",
			},
			expectedError: "",
		},
		{
			name:           "Invalid token",
			token:          "invalid.token.string",
			expectedClaims: nil,
			expectedError:  "token contains an invalid number of segments",
		},
		{
			name:           "Empty token",
			token:          "",
			expectedClaims: nil,
			expectedError:  "token contains an invalid number of segments",
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			claims, err := ValidateJWT(tc.token)
			if tc.expectedError != "" {
				assert.Error(t, err)
				assert.Nil(t, claims)
			} else {
				assert.NoError(t, err)
				assert.NotNil(t, claims)
				assert.Equal(t, tc.expectedClaims.Scope, claims.Scope)
				assert.NotEmpty(t, claims.ID)
				assert.NotEmpty(t, claims.Email)
				assert.NotEmpty(t, claims.Audience)
			}
		})
	}
}

func TestInitializeKeys(t *testing.T) {
	originalJwksUrl := config.Sentinel.JwksUrl
	t.Run("Invalid JWKS URL", func(t *testing.T) {
		config.Sentinel.JwksUrl = "https://example.com/jwks"
		InitializeKeys()
	})
	config.Sentinel.JwksUrl = originalJwksUrl
	InitializeKeys()
}
