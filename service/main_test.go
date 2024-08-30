package service

import (
	"context"
	"jiffy/config"
	"jiffy/database"
	"jiffy/utils"
	"log"
	"os"
	"testing"

	"github.com/testcontainers/testcontainers-go/modules/mysql"
	"go.uber.org/zap"
)

func TestMain(m *testing.M) {
	// Initialize the logger
	logger, _ := zap.NewDevelopment()
	utils.SugarLogger = logger.Sugar()
	InitializeKeys()

	// Start MySQL container
	ctx := context.Background()
	mysqlContainer, err := mysql.Run(ctx,
		"mysql:8.0.36",
		mysql.WithDatabase(config.DatabaseName),
		mysql.WithUsername(config.DatabaseUser),
		mysql.WithPassword(config.DatabasePassword),
	)
	if err != nil {
		log.Fatalf("failed to start container: %s", err)
	}
	port, err := mysqlContainer.MappedPort(ctx, "3306/tcp")
	if err != nil {
		log.Fatalf("failed to get container port: %s", err)
	}
	host, err := mysqlContainer.Host(ctx)
	if err != nil {
		log.Fatalf("failed to get container host: %s", err)
	}
	config.DatabaseHost = host
	config.DatabasePort = port.Port()
	defer func() {
		if err := mysqlContainer.Terminate(ctx); err != nil {
			log.Fatalf("failed to terminate container: %s", err)
		}
	}()
	database.InitializeDB()

	// Run the tests
	code := m.Run()

	// Clean up
	utils.SugarLogger.Sync()

	os.Exit(code)
}

func ResetDB() {
	database.DB.Exec("DELETE FROM user_roles")
}
