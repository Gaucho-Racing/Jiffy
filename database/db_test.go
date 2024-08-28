package database

import (
	"context"
	"jiffy/config"
	"jiffy/utils"
	"log"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/testcontainers/testcontainers-go/modules/mysql"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

func TestInitializeDB(t *testing.T) {
	// Initialize logger
	logger, _ := zap.NewDevelopment()
	utils.SugarLogger = logger.Sugar()

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

	// Clean up the container
	defer func() {
		if err := mysqlContainer.Terminate(ctx); err != nil {
			log.Fatalf("failed to terminate container: %s", err)
		}
	}()

	// Test successful connection
	t.Run("Successful Connection", func(t *testing.T) {
		InitializeDB()
		assert.NotNil(t, DB, "DB should not be nil after successful connection")
		assert.IsType(t, &gorm.DB{}, DB, "DB should be of type *gorm.DB")
	})

	// Test retry mechanism
	t.Run("Retry Mechanism", func(t *testing.T) {
		config.DatabaseHost = "non-existent-host"

		defer func() {
			if r := recover(); r == nil {
				t.Errorf("The code did not panic as expected")
			}
		}()

		InitializeDB()
		t.Errorf("InitializeDB() did not panic as expected")
	})

	// // Test max retries
	// t.Run("Max Retries", func(t *testing.T) {
	// 	originalHost := config.DatabaseHost
	// 	config.DatabaseHost = "non-existent-host"

	// 	defer func() {
	// 		if r := recover(); r == nil {
	// 			t.Errorf("The code did not panic")
	// 		}
	// 		config.DatabaseHost = originalHost
	// 	}()

	// 	InitializeDB()
	// })
}
