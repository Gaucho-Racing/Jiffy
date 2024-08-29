package main

import (
	"jiffy/api"
	"jiffy/config"
	"jiffy/database"
	"jiffy/service"
	"jiffy/utils"
)

func main() {
	config.PrintStartupBanner()
	utils.InitializeLogger()
	utils.VerifyConfig()
	defer utils.Logger.Sync()

	database.InitializeDB()
	service.ConnectDiscord()
	service.PingSentinel()

	router := api.SetupRouter()
	api.InitializeRoutes(router)
	err := router.Run(":" + config.Port)
	if err != nil {
		utils.SugarLogger.Fatalln(err)
	}
}
