package config

import "os"

var Version = "1.0.0"
var Env = os.Getenv("ENV")
var Port = os.Getenv("PORT")
var Prefix = os.Getenv("PREFIX")

var DatabaseHost = os.Getenv("DATABASE_HOST")
var DatabasePort = os.Getenv("DATABASE_PORT")
var DatabaseUser = os.Getenv("DATABASE_USER")
var DatabasePassword = os.Getenv("DATABASE_PASSWORD")
var DatabaseName = os.Getenv("DATABASE_NAME")

var DiscordToken = os.Getenv("DISCORD_TOKEN")
var DiscordGuild = os.Getenv("DISCORD_GUILD")
var DiscordLogChannel = os.Getenv("DISCORD_LOG_CHANNEL")

var DepartmentNames = []string{"Aerodynamics", "Business", "Chassis", "Data", "Electronics", "Powertrain", "Suspension"}
