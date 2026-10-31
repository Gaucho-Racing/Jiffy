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
		if err := db.AutoMigrate(
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
		); err != nil {
			utils.SugarLogger.Fatalf("AutoMigration failed: %v", err)
		}
		utils.SugarLogger.Infoln("AutoMigration complete")
		DB = db
		// Academic year starts September 1 Pacific Time. The stored year is
		// that September's calendar year. AutoMigrate adds the column as NULL
		// on existing rows; leave any later explicit year alone.
		if err := db.Exec(`
			UPDATE purchase_request
			SET year = (
				EXTRACT(YEAR FROM created_at AT TIME ZONE 'America/Los_Angeles')::int
				- CASE
					WHEN EXTRACT(MONTH FROM created_at AT TIME ZONE 'America/Los_Angeles')::int >= 9 THEN 0
					ELSE 1
				END
			)
			WHERE year IS NULL OR year = 0
		`).Error; err != nil {
			utils.SugarLogger.Errorf("purchase request year backfill failed: %v", err)
		}
	}
	return nil
}
