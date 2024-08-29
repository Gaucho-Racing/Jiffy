package service

import (
	"context"
	"fmt"
	"jiffy/config"
	"jiffy/model"
	"jiffy/utils"
	"strings"

	"github.com/golang-jwt/jwt"
	"github.com/lestrrat-go/jwx/jwk"
)

var publicKey interface{}

func InitializeKeys() {
	set, err := jwk.Fetch(context.Background(), config.Sentinel.JwksUrl)
	if err != nil {
		utils.SugarLogger.Errorln("Failed to fetch JWKS:", err)
	}

	key, ok := set.Get(0)
	if !ok {
		utils.SugarLogger.Errorln("No keys found in JWKS")
	}

	if err := key.Raw(&publicKey); err != nil {
		utils.SugarLogger.Errorln("Failed to get public key:", err)
	}
}

func ValidateJWT(token string) (*model.AuthClaims, error) {
	claims := &model.AuthClaims{}
	_, err := jwt.ParseWithClaims(token, claims, func(token *jwt.Token) (interface{}, error) {
		return publicKey, nil
	})
	if err != nil {
		utils.SugarLogger.Errorln(err.Error())
		return nil, err
	}
	if len(claims.Audience) == 0 {
		return nil, fmt.Errorf("token has invalid audience")
	}
	if claims.Audience[0] != "sentinel" {
		if claims.Audience[0] != config.Sentinel.ClientID {
			return nil, fmt.Errorf("token has invalid audience")
		}
	}
	if claims.Audience[0] != "sentinel" && strings.Contains(claims.Scope, "sentinel:all") {
		return nil, fmt.Errorf("token has unauthorized scope")
	}
	return claims, nil
}
