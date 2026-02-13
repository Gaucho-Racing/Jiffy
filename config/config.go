package config

import "os"

var Version = "2.3.0"
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

var DepartmentNames = []string{"Aerodynamics", "Business", "Chassis", "Data", "Drivetrain", "Firmware", "High Voltage", "Low Voltage", "Suspension", "Systems"}

var Sentinel = struct {
	Url          string
	JwksUrl      string
	ClientID     string
	ClientSecret string
	Token        string
	RedirectURI  string
}{
	Url:          os.Getenv("SENTINEL_URL"),
	JwksUrl:      os.Getenv("SENTINEL_JWKS_URL"),
	ClientID:     os.Getenv("SENTINEL_CLIENT_ID"),
	ClientSecret: os.Getenv("SENTINEL_CLIENT_SECRET"),
	Token:        os.Getenv("SENTINEL_TOKEN"),
	RedirectURI:  os.Getenv("SENTINEL_REDIRECT_URI"),
}

var S3 = struct {
	AccessKey string
	SecretKey string
	Region    string
	Bucket    string
}{
	AccessKey: os.Getenv("S3_ACCESS_KEY"),
	SecretKey: os.Getenv("S3_SECRET_KEY"),
	Region:    os.Getenv("S3_REGION"),
	Bucket:    os.Getenv("S3_BUCKET"),
}

var DriveServiceAccount = os.Getenv("DRIVE_SERVICE_ACCOUNT")
var GR26PurchaseRequestsSheetID = "1ZLmZxU0ZGiXS--56xRe0yNJlGU9n3NGLopQwtf0JLyw"
var SheetsCron = os.Getenv("SHEETS_CRON")
