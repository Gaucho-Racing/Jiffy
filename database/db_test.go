package database

import (
	"context"
	"jiffy/config"
	"jiffy/utils"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/wait"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

func TestInitializeDB(t *testing.T) {
	// Initialize logger
	logger, _ := zap.NewDevelopment()
	utils.SugarLogger = logger.Sugar()

	// Start SingleStore container
	ctx := context.Background()
	req := testcontainers.ContainerRequest{
		Image:        "ghcr.io/singlestore-labs/singlestoredb-dev:latest",
		ExposedPorts: []string{"3306/tcp"},
		Env: map[string]string{
			"SINGLESTORE_LICENSE": "DEVELOPER_EDITION",
		},
		WaitingFor: wait.ForLog("Server is ready for connections"),
	}
	singleStoreC, err := testcontainers.GenericContainer(ctx, testcontainers.GenericContainerRequest{
		ContainerRequest: req,
		Started:          true,
	})
	if err != nil {
		t.Fatal(err)
	}
	defer singleStoreC.Terminate(ctx)

	// Get host and port
	host, err := singleStoreC.Host(ctx)
	if err != nil {
		t.Fatal(err)
	}
	port, err := singleStoreC.MappedPort(ctx, "3306")
	if err != nil {
		t.Fatal(err)
	}

	// Set up config for database connection
	config.DatabaseHost = host
	config.DatabasePort = port.Port()
	config.DatabaseUser = "root"
	config.DatabasePassword = ""
	config.DatabaseName = "test"

	// Test successful connection
	t.Run("Successful Connection", func(t *testing.T) {
		InitializeDB()
		assert.NotNil(t, DB, "DB should not be nil after successful connection")
		assert.IsType(t, &gorm.DB{}, DB, "DB should be of type *gorm.DB")
	})

	// Test retry mechanism
	t.Run("Retry Mechanism", func(t *testing.T) {
		originalHost := config.DatabaseHost
		config.DatabaseHost = "non-existent-host"

		go func() {
			time.Sleep(2 * time.Second)
			config.DatabaseHost = originalHost
		}()

		InitializeDB()
		assert.NotNil(t, DB, "DB should not be nil after successful retry")
		assert.IsType(t, &gorm.DB{}, DB, "DB should be of type *gorm.DB")
	})

	// Test max retries
	t.Run("Max Retries", func(t *testing.T) {
		originalHost := config.DatabaseHost
		config.DatabaseHost = "non-existent-host"

		defer func() {
			if r := recover(); r == nil {
				t.Errorf("The code did not panic")
			}
			config.DatabaseHost = originalHost
		}()

		InitializeDB()
	})
}

func TestDBOperations(t *testing.T) {
	// This test assumes InitializeDB has been called and DB is set up
	if DB == nil {
		InitializeDB()
	}

	// Test model
	type TestModel struct {
		gorm.Model
		Name string
	}

	// Auto migrate
	err := DB.AutoMigrate(&TestModel{})
	assert.NoError(t, err, "Auto migration should not produce an error")

	// Create
	testRecord := TestModel{Name: "Test Record"}
	result := DB.Create(&testRecord)
	assert.NoError(t, result.Error, "Creating a record should not produce an error")
	assert.NotZero(t, testRecord.ID, "Created record should have a non-zero ID")

	// Read
	var readRecord TestModel
	result = DB.First(&readRecord, testRecord.ID)
	assert.NoError(t, result.Error, "Reading a record should not produce an error")
	assert.Equal(t, testRecord.Name, readRecord.Name, "Read record should match created record")

	// Update
	readRecord.Name = "Updated Test Record"
	result = DB.Save(&readRecord)
	assert.NoError(t, result.Error, "Updating a record should not produce an error")

	// Delete
	result = DB.Delete(&readRecord)
	assert.NoError(t, result.Error, "Deleting a record should not produce an error")

	// Verify deletion
	result = DB.First(&TestModel{}, testRecord.ID)
	assert.Error(t, result.Error, "Reading a deleted record should produce an error")
	assert.Equal(t, gorm.ErrRecordNotFound, result.Error, "Error should be 'record not found'")
}
