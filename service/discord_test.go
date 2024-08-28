package service

import (
	"jiffy/config"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

func TestConnectDiscord(t *testing.T) {
	ConnectDiscord()
	assert.NotNil(t, Discord, "Discord session should not be nil")
}

func TestSendMessage(t *testing.T) {
	channelID := config.DiscordLogChannel
	message := "Test message from Jiffy unit test"

	SendMessage(channelID, message)

	// We can't easily verify the message was sent, but we can check that no panic occurred
}

func TestSendDisappearingMessage(t *testing.T) {
	channelID := config.DiscordLogChannel
	message := "Test disappearing message from Jiffy unit test"
	delay := time.Second * 5

	SendDisappearingMessage(channelID, message, delay)

	time.Sleep(time.Second)

	// We can't easily verify the message was sent and deleted, but we can check that no panic occurred
}

func TestSendDirectMessage(t *testing.T) {
	userID := "1258902460999667887"
	message := "Test DM from Jiffy unit test"

	SendDirectMessage(userID, message)

	// We can't easily verify the DM was sent, but we can check that no panic occurred
}
