package main

import (
	"jiffy/api"
	"jiffy/config"
	"jiffy/database"
	"jiffy/jobs"
	"jiffy/service"
	"jiffy/utils"
)

func main() {
	config.PrintStartupBanner()
	utils.InitializeLogger()
	utils.VerifyConfig()
	defer utils.Logger.Sync()

	database.InitializeDB()
	service.InitializeKeys()
	//service.ConnectDiscord()
	service.PingSentinel()
	service.InitializeDepartments()
	service.InitializeApproverGroups()
	service.InitializeS3()
	service.InitializeDrive()

	// Register cron jobs
	jobs.RegisterSheetsCronJob()

	router := api.SetupRouter()
	api.InitializeRoutes(router)
	err := router.Run(":" + config.Port)
	if err != nil {
		utils.SugarLogger.Fatalln(err)
	}
}
