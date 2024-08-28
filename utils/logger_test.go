package utils

import (
	"jiffy/config"
	"testing"
)

func TestInitializeLogger(t *testing.T) {
	t.Run("Logger Test Env DEV", func(t *testing.T) {
		config.Env = "DEV"
		InitializeLogger()
		if Logger == nil {
			t.Error("Expected Logger to not be nil")
		}
		if SugarLogger == nil {
			t.Error("Expected SugarLogger to not be nil")
		}
	})
	t.Run("Logger Test Env PROD", func(t *testing.T) {
		config.Env = "PROD"
		InitializeLogger()
		if Logger == nil {
			t.Error("Expected Logger to not be nil")
		}
		if SugarLogger == nil {
			t.Error("Expected SugarLogger to not be nil")
		}
	})
}
