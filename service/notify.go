package service

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"jiffy/config"
	"jiffy/utils"
	"net/http"
	"strings"
	"time"
)

// notifyHTTPClient is separate from the Sentinel client so a slow Notify
// response cannot stall purchase-request reads.
var notifyHTTPClient = &http.Client{Timeout: 10 * time.Second}

type notifyRecipient struct {
	EntityID  string
	DiscordID string
}

type notifyDMBody struct {
	Channel    string            `json:"channel"`
	Category   string            `json:"category"`
	Recipients notifyRecipients  `json:"recipients"`
	Discord    notifyDiscordBody `json:"discord"`
}

type notifyRecipients struct {
	EntityIDs []string `json:"entity_ids"`
	GroupIDs  []string `json:"group_ids"`
}

type notifyDiscordBody struct {
	Content string `json:"content"`
}

func notifyBaseURL() string {
	if configured := strings.TrimRight(strings.TrimSpace(config.NotifyURL), "/"); configured != "" {
		return configured
	}
	// Production no longer has a Discord bot token. Notify is the replacement,
	// and the API host is stable, so prod can call it without a new manifest
	// entry. Local stacks stay quiet unless NOTIFY_URL is set.
	if config.Env == "PROD" {
		return "https://notify.gauchoracing.com/api"
	}
	return ""
}

func discordDMBody(entityID, content string) notifyDMBody {
	return notifyDMBody{
		Channel:  "DISCORD",
		Category: "jiffy.purchase_request",
		Recipients: notifyRecipients{
			EntityIDs: []string{entityID},
			GroupIDs:  []string{},
		},
		Discord: notifyDiscordBody{Content: content},
	}
}

// rewriteDiscordMention swaps a stored Jiffy user id for the Discord snowflake
// Notify will actually deliver to. usr_ ids are not Discord mentions.
func rewriteDiscordMention(content, userID, discordID string) string {
	if userID == "" || discordID == "" || userID == discordID {
		return content
	}
	return strings.ReplaceAll(content, "<@"+userID+">", "<@"+discordID+">")
}

// SendDirectMessage delivers a purchase-request DM through Notify.
// Unmigrated Discord snowflakes are resolved to a Sentinel entity first.
// Jiffy's own Discord bot is not used; that path predates Notify and the
// production deploy no longer injects a bot token.
func SendDirectMessage(userID string, message string) {
	base := notifyBaseURL()
	if base == "" {
		utils.SugarLogger.Errorln("NOTIFY_URL is not set; Discord DM not sent")
		return
	}
	token := sentinelServiceToken()
	if token == "" {
		utils.SugarLogger.Errorln("SENTINEL_TOKEN is not set; cannot authenticate to Notify")
		return
	}

	recipient, err := resolveNotifyRecipient(userID)
	if err != nil {
		utils.SugarLogger.Errorf("Discord DM for %s not sent: %v", userID, err)
		return
	}
	message = rewriteDiscordMention(message, userID, recipient.DiscordID)

	payload, err := json.Marshal(discordDMBody(recipient.EntityID, message))
	if err != nil {
		utils.SugarLogger.Errorf("Discord DM for %s not sent: %v", userID, err)
		return
	}

	req, err := http.NewRequest(http.MethodPost, base+"/messages", bytes.NewReader(payload))
	if err != nil {
		utils.SugarLogger.Errorf("Discord DM for %s not sent: %v", userID, err)
		return
	}
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")

	resp, err := notifyHTTPClient.Do(req)
	if err != nil {
		utils.SugarLogger.Errorf("Discord DM for %s failed: %v", userID, err)
		return
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(io.LimitReader(resp.Body, 2048))
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		utils.SugarLogger.Errorf("Notify rejected Discord DM for %s: [%d] %s", userID, resp.StatusCode, strings.TrimSpace(string(body)))
		if resp.StatusCode == http.StatusForbidden {
			utils.SugarLogger.Errorln("Jiffy's service account needs a Notify application policy that allows the DISCORD channel. That policy is created in Notify, not in Sentinel.")
		}
		return
	}
	utils.SugarLogger.Infof("Queued Discord DM for %s via Notify (entity %s)", userID, recipient.EntityID)
}

func resolveNotifyRecipient(userID string) (notifyRecipient, error) {
	userID = strings.TrimSpace(userID)
	if userID == "" {
		return notifyRecipient{}, fmt.Errorf("user id is required")
	}
	if isSentinelUserID(userID) {
		user, err := fetchSentinelUser(userID)
		if err != nil {
			return notifyRecipient{}, err
		}
		if strings.TrimSpace(user.EntityID) == "" {
			return notifyRecipient{}, fmt.Errorf("sentinel user %s has no entity id", userID)
		}
		discordID, _ := discordIDForEntity(user.EntityID)
		return notifyRecipient{EntityID: user.EntityID, DiscordID: discordID}, nil
	}

	entityID, err := entityIDForDiscordUser(userID)
	if err != nil {
		return notifyRecipient{}, fmt.Errorf("unmigrated Discord user %s has no linked Sentinel entity, so Notify cannot DM them: %w", userID, err)
	}
	return notifyRecipient{EntityID: entityID, DiscordID: userID}, nil
}
