package database

import (
	"fmt"
	"jiffy/config"
	"jiffy/model"
	"jiffy/utils"
	"time"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

var DB *gorm.DB

var dbRetries = 0

func InitializeDB() error {
	dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=disable TimeZone=UTC", config.DatabaseHost, config.DatabaseUser, config.DatabasePassword, config.DatabaseName, config.DatabasePort)
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		if dbRetries < 5 {
			dbRetries++
			utils.SugarLogger.Errorln("failed to connect database, retrying in 5s... ")
			time.Sleep(time.Second * 5)
			InitializeDB()
		} else {
			utils.SugarLogger.Fatalln("failed to connect database after 5 attempts")
		}
	} else {
		utils.SugarLogger.Infoln("Connected to database")
		db.AutoMigrate(
			&model.UserRole{},
			&model.UnmigratedUser{},
			&model.Department{},
			&model.DepartmentApprover{},
			&model.DepartmentBudget{},
			&model.ApproverGroup{},
			&model.ApproverGroupDepartment{},
			&model.ApproverGroupApprover{},
			&model.PurchaseRequest{},
			&model.PurchaseRequestItem{},
			&model.PurchaseRequestApproval{},
			&model.PurchaseRequestNote{},
			&model.PurchaseRequestAttachment{},
			&model.ShippingAddress{},
		)
		utils.SugarLogger.Infoln("AutoMigration complete")
		DB = db
		// Year is the Pacific Time calendar year of created_at. Zero means the
		// column was just added; leave any later explicit year alone.
		if err := db.Exec(`
			UPDATE purchase_request
			SET year = EXTRACT(YEAR FROM created_at AT TIME ZONE 'America/Los_Angeles')::int
			WHERE year = 0
		`).Error; err != nil {
			utils.SugarLogger.Errorf("purchase request year backfill failed: %v", err)
		}
	}
	return nil
}
