package service

import (
	"jiffy/config"
	"os"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

func TestConnectDiscord(t *testing.T) {
	t.Run("Error", func(t *testing.T) {
		originalToken := config.DiscordToken
		config.DiscordToken = "invalid_token"
		ConnectDiscord()
		config.DiscordToken = originalToken
	})
	t.Run("Success", func(t *testing.T) {
		config.DiscordToken = os.Getenv("DISCORD_TOKEN")
		config.DiscordGuild = "756738476887638107"
		ConnectDiscord()
		assert.NotNil(t, Discord, "Discord session should not be nil")
	})
}

func TestSendMessage(t *testing.T) {
	t.Run("Success", func(t *testing.T) {
		channelID := config.DiscordLogChannel
		message := "Test message from Jiffy unit test"
		SendMessage(channelID, message)
		// We can't easily verify the message was sent, but we can check that no panic occurred
	})

	t.Run("Error", func(t *testing.T) {
		SendMessage("invalid_channel", "Test message from Jiffy unit test")
		// We expect this to log an error, but not panic
	})
}

func TestSendDisappearingMessage(t *testing.T) {
	t.Run("Success", func(t *testing.T) {
		channelID := config.DiscordLogChannel
		message := "Test disappearing message from Jiffy unit test"
		delay := time.Second * 5
		SendDisappearingMessage(channelID, message, delay)
		time.Sleep(time.Second)
		// We can't easily verify the message was sent and deleted, but we can check that no panic occurred
	})

	t.Run("Error", func(t *testing.T) {
		SendDisappearingMessage("invalid_channel", "Test disappearing message from Jiffy unit test", time.Second*5)
		// We expect this to log an error, but not panic
	})
}

func TestSendDirectMessage(t *testing.T) {
	t.Run("Success", func(t *testing.T) {
		userID := "1258902460999667887"
		message := "Test DM from Jiffy unit test"
		SendDirectMessage(userID, message)
		// We can't easily verify the DM was sent, but we can check that no panic occurred
	})

	t.Run("Error", func(t *testing.T) {
		SendDirectMessage("invalid_user", "Test DM from Jiffy unit test")
		// We expect this to log an error, but not panic
	})
}
