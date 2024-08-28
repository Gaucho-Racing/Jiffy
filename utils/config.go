package utils

import "jiffy/config"

func VerifyConfig() {
	if config.Port == "" {
		config.Port = "9999"
		SugarLogger.Infof("PORT is not set, defaulting to %s", config.Port)
	}
	if config.DatabaseHost == "" {
		config.DatabaseHost = "localhost"
		SugarLogger.Infof("DATABASE_HOST is not set, defaulting to %s", config.DatabaseHost)
	}
	if config.DatabasePort == "" {
		config.DatabasePort = "3306"
		SugarLogger.Infof("DATABASE_PORT is not set, defaulting to %s", config.DatabasePort)
	}
	if config.DatabaseUser == "" {
		config.DatabaseUser = "root"
		SugarLogger.Infof("DATABASE_USER is not set, defaulting to %s", config.DatabaseUser)
	}
	if config.DatabasePassword == "" {
		config.DatabasePassword = "password"
		SugarLogger.Infof("DATABASE_PASSWORD is not set, defaulting to %s", config.DatabasePassword)
	}
	if config.DiscordToken == "" {
		SugarLogger.Errorf("DISCORD_TOKEN is not set")
	}
	if config.DiscordGuild == "" {
		SugarLogger.Errorf("DISCORD_GUILD is not set")
	}
	if config.DiscordLogChannel == "" {
		SugarLogger.Errorf("DISCORD_LOG_CHANNEL is not set")
	}
}
