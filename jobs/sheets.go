package jobs

import (
	"jiffy/config"
	"jiffy/service"
	"jiffy/utils"
	"strconv"
	"sync"

	cron "github.com/robfig/cron/v3"
)

func RegisterSheetsCronJob() {
	if config.Env != "PROD" {
		utils.SugarLogger.Infoln("Sheets CRON Job not registered because environment is not PROD")
		return
	}
	c := cron.New()
	entryID, err := c.AddFunc(config.SheetsCron, func() {
		// _, _ = service.Discord.ChannelMessageSend(config.DiscordLogChannel, ":alarm_clock: Starting google drive CRON Job")
		utils.SugarLogger.Infoln("Starting google drive CRON Job...")
		var wg sync.WaitGroup
		wg.Add(1)
		go func() {
			defer wg.Done()
			service.PopulateGR26PurchaseRequestsSheet()
		}()
		wg.Wait()
		utils.SugarLogger.Infoln("Finished Jiffy Sheet CRON Job!")
		// _, _ = service.Discord.ChannelMessageSend(config.DiscordLogChannel, ":white_check_mark: Finished Jiffy Sheet job!")
	})
	if err != nil {
		utils.SugarLogger.Errorln("Error registering CRON Job: " + err.Error())
		return
	}
	c.Start()
	utils.SugarLogger.Infoln("Registered CRON Job: " + strconv.Itoa(int(entryID)) + " scheduled with cron expression: " + config.SheetsCron)
}
