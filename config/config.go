package config

import (
	"os"
	"strings"
)

var Version = "2.3.4"
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
	SAToken      string
	RedirectURI  string
}{
	Url:          os.Getenv("SENTINEL_URL"),
	JwksUrl:      os.Getenv("SENTINEL_JWKS_URL"),
	ClientID:     os.Getenv("SENTINEL_CLIENT_ID"),
	ClientSecret: os.Getenv("SENTINEL_CLIENT_SECRET"),
	Token:        os.Getenv("SENTINEL_TOKEN"),
	SAToken:      os.Getenv("SENTINEL_SA_TOKEN"),
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

// PurchaseRequestsSheetID is the workbook the dump writes. Set
// PURCHASE_REQUESTS_SHEET_ID to a new spreadsheet. Empty keeps the previous
// GR26 workbook so an existing deploy does not change destination.
var PurchaseRequestsSheetID = firstNonEmpty(os.Getenv("PURCHASE_REQUESTS_SHEET_ID"), "1ZLmZxU0ZGiXS--56xRe0yNJlGU9n3NGLopQwtf0JLyw")
var SheetsCron = os.Getenv("SHEETS_CRON")

func PurchaseRequestsSheetURL() string {
	if PurchaseRequestsSheetID == "" {
		return ""
	}
	return "https://docs.google.com/spreadsheets/d/" + PurchaseRequestsSheetID + "/"
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		value = strings.TrimSpace(value)
		if value != "" {
			return value
		}
	}
	return ""
}

// NotifyURL is the Notify API base, including the /api prefix.
// Empty outside production unless set; production defaults in the Notify client.
var NotifyURL = os.Getenv("NOTIFY_URL")
