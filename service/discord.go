package service

import (
	"jiffy/config"
	"jiffy/utils"
	"time"

	"github.com/bwmarrin/discordgo"
)

var Discord *discordgo.Session

func ConnectDiscord() {
	dg, err := discordgo.New("Bot " + config.DiscordToken)
	if err != nil {
		utils.SugarLogger.Errorln("Error creating Discord session, ", err)
		return
	}
	Discord = dg
	_, err = Discord.ChannelMessageSend(config.DiscordLogChannel, ":white_check_mark: Jiffy v"+config.Version+" online! `[ENV = "+config.Env+"]` `[PREFIX = "+config.Prefix+"]`")
	if err != nil {
		utils.SugarLogger.Errorln("Error sending Discord message, ", err)
		return
	}
}

func SendMessage(channelID string, message string) {
	_, err := Discord.ChannelMessageSend(channelID, message)
	if err != nil {
		utils.SugarLogger.Errorln(err.Error())
	}
}

func SendDisappearingMessage(channelID string, message string, delay time.Duration) {
	msg, err := Discord.ChannelMessageSend(channelID, message)
	if err != nil {
		utils.SugarLogger.Errorln(err.Error())
	}
	go DelayedMessageDelete(channelID, msg.ID, delay)
}

func DelayedMessageDelete(channelID string, messageID string, delay time.Duration) {
	time.Sleep(delay)
	_ = Discord.ChannelMessageDelete(channelID, messageID)
}

func SendDirectMessage(userID string, message string) {
	channel, err := Discord.UserChannelCreate(userID)
	if err != nil {
		utils.SugarLogger.Errorln(err.Error())
	}
	_, err = Discord.ChannelMessageSend(channel.ID, message)
	if err != nil {
		utils.SugarLogger.Errorln(err.Error())
	}
}
