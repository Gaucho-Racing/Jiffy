package service

import (
	"fmt"
	"jiffy/model"
	"math/big"
	"strings"
	"sync"
	"time"
)

const profileCacheTTL = 10 * time.Minute

type sentinelUserCacheEntry struct {
	user sentinelDirectoryUser
	at   time.Time
}

type sentinelEntityCacheEntry struct {
	entity sentinelEntityProfile
	at     time.Time
}

var (
	profileCacheMu sync.Mutex
	userCache      = map[string]sentinelUserCacheEntry{}
	entityCache    = map[string]sentinelEntityCacheEntry{}
)

func cachedSentinelUser(id string) (sentinelDirectoryUser, bool) {
	profileCacheMu.Lock()
	defer profileCacheMu.Unlock()
	entry, ok := userCache[id]
	if !ok || time.Since(entry.at) > profileCacheTTL {
		return sentinelDirectoryUser{}, false
	}
	return entry.user, true
}

func storeSentinelUser(user sentinelDirectoryUser) {
	if user.ID == "" {
		return
	}
	profileCacheMu.Lock()
	defer profileCacheMu.Unlock()
	userCache[user.ID] = sentinelUserCacheEntry{user: user, at: time.Now()}
}

func cachedSentinelEntity(id string) (sentinelEntityProfile, bool) {
	profileCacheMu.Lock()
	defer profileCacheMu.Unlock()
	entry, ok := entityCache[id]
	if !ok || time.Since(entry.at) > profileCacheTTL {
		return sentinelEntityProfile{}, false
	}
	return entry.entity, true
}

func storeSentinelEntity(entity sentinelEntityProfile) {
	if entity.ID == "" {
		return
	}
	profileCacheMu.Lock()
	defer profileCacheMu.Unlock()
	entityCache[entity.ID] = sentinelEntityCacheEntry{entity: entity, at: time.Now()}
}

// enrichAvatars fills avatar_url for users shown on a purchase request.
// Names still come from the local migration tables. Pictures come from
// Sentinel's avatar_url, then from the linked Discord account.
func enrichAvatars(users map[string]model.User) {
	if len(users) == 0 {
		return
	}
	var wg sync.WaitGroup
	var mu sync.Mutex
	for id, user := range users {
		if strings.TrimSpace(user.AvatarURL) != "" {
			continue
		}
		wg.Add(1)
		go func(id string, user model.User) {
			defer wg.Done()
			user.AvatarURL = lookupAvatarURL(user)
			mu.Lock()
			users[id] = user
			mu.Unlock()
		}(id, user)
	}
	wg.Wait()
}

func lookupAvatarURL(user model.User) string {
	if strings.TrimSpace(user.AvatarURL) != "" {
		return user.AvatarURL
	}
	if isSentinelUserID(user.ID) {
		if directory, err := fetchSentinelUser(user.ID); err == nil {
			if directory.AvatarURL != "" {
				return directory.AvatarURL
			}
			if directory.EntityID != "" {
				if url := avatarURLForEntity(directory.EntityID); url != "" {
					return url
				}
			}
		}
		return ""
	}
	if entityID, err := entityIDForDiscordUser(user.ID); err == nil {
		if url := avatarURLForEntity(entityID); url != "" {
			return url
		}
	}
	return discordDefaultAvatarURL(user.ID)
}

func avatarURLForEntity(entityID string) string {
	entity, err := fetchSentinelEntity(entityID)
	if err != nil {
		return ""
	}
	for _, auth := range entity.ExternalAuths {
		if auth.Provider != "DISCORD" {
			continue
		}
		hash, _ := auth.Metadata["avatar"].(string)
		return discordAvatarURL(auth.ExternalID, hash)
	}
	return ""
}

func discordAvatarURL(discordID, hash string) string {
	discordID = strings.TrimSpace(discordID)
	hash = strings.TrimSpace(hash)
	if discordID == "" {
		return ""
	}
	if hash == "" {
		return discordDefaultAvatarURL(discordID)
	}
	ext := "png"
	if strings.HasPrefix(hash, "a_") {
		ext = "gif"
	}
	return fmt.Sprintf("https://cdn.discordapp.com/avatars/%s/%s.%s", discordID, hash, ext)
}

// discordDefaultAvatarURL matches Discord's default embed avatar index:
// (snowflake >> 22) % 6.
func discordDefaultAvatarURL(discordID string) string {
	n := new(big.Int)
	if _, ok := n.SetString(strings.TrimSpace(discordID), 10); !ok {
		return "https://cdn.discordapp.com/embed/avatars/0.png"
	}
	index := new(big.Int).Rsh(n, 22)
	index.Mod(index, big.NewInt(6))
	return fmt.Sprintf("https://cdn.discordapp.com/embed/avatars/%s.png", index.String())
}
