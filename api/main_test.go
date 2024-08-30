package api

import (
	"jiffy/service"
	"jiffy/utils"
	"os"
	"testing"

	"go.uber.org/zap"
)

func TestMain(m *testing.M) {
	// Initialize the logger
	logger, _ := zap.NewDevelopment()
	utils.SugarLogger = logger.Sugar()
	service.InitializeKeys()

	// Run the tests
	code := m.Run()

	// Clean up
	utils.SugarLogger.Sync()

	os.Exit(code)
}
