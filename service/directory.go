package service

import (
	"errors"
	"jiffy/model"
	"jiffy/utils"
	"sort"
	"strings"
	"sync"
	"time"
)

var errNoDirectoryToken = errors.New("no sentinel token available")

const directoryTTL = 5 * time.Minute

// sentinelListUser is the slice of a Sentinel user the pickers need.
// Phone, birthday, and the rest of the profile stay in Sentinel.
type sentinelListUser struct {
	ID        string `json:"id"`
	EntityID  string `json:"entity_id"`
	Username  string `json:"username"`
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
	Email     string `json:"email"`
	AvatarURL string `json:"avatar_url"`
}

var (
	directoryMu     sync.Mutex
	directoryPeople []sentinelListUser
	directoryAt     time.Time
)

// SearchDirectory filters the Sentinel user list by name or username.
// Notify's playground does the same filter in the browser after GET /users.
// That Notify route is limited to Notify admins, so Jiffy asks Sentinel
// directly with the signed-in member's token. Jiffy login already requests
// user:read, which is the scope Sentinel's user list checks.
func SearchDirectory(accessToken string, query string, limit int) ([]model.User, error) {
	query = strings.TrimSpace(query)
	if query == "" {
		return []model.User{}, nil
	}
	if limit <= 0 {
		limit = 6
	}
	people, err := loadDirectory(accessToken)
	if err != nil {
		utils.SugarLogger.Warnf("sentinel user directory unavailable: %v", err)
		return nil, err
	}
	return filterDirectory(people, query, limit), nil
}

func warmDirectory(accessToken string) {
	if _, err := loadDirectory(accessToken); err != nil {
		utils.SugarLogger.Warnf("sentinel user directory unavailable: %v", err)
	}
}

func usersNeedDirectory(users map[string]model.User) bool {
	for id, user := range users {
		if !isSentinelUserID(id) {
			continue
		}
		if strings.TrimSpace(user.FirstName) != "" || strings.TrimSpace(user.LastName) != "" {
			continue
		}
		if _, ok := cachedSentinelUser(id); ok {
			continue
		}
		return true
	}
	return false
}

func usersByID(users []model.User) map[string]model.User {
	out := make(map[string]model.User, len(users))
	for _, user := range users {
		out[user.ID] = user
	}
	return out
}

func loadDirectory(accessToken string) ([]sentinelListUser, error) {
	directoryMu.Lock()
	if directoryPeople != nil && time.Since(directoryAt) < directoryTTL {
		people := directoryPeople
		directoryMu.Unlock()
		return people, nil
	}
	directoryMu.Unlock()

	people, err := fetchDirectory(accessToken)
	if err != nil {
		return nil, err
	}
	sort.Slice(people, func(i, j int) bool {
		left := strings.ToLower(strings.TrimSpace(people[i].FirstName + " " + people[i].LastName))
		right := strings.ToLower(strings.TrimSpace(people[j].FirstName + " " + people[j].LastName))
		if left == right {
			return strings.ToLower(people[i].Username) < strings.ToLower(people[j].Username)
		}
		return left < right
	})
	for _, person := range people {
		storeSentinelUser(sentinelDirectoryUser{
			ID:        person.ID,
			EntityID:  person.EntityID,
			Username:  person.Username,
			FirstName: person.FirstName,
			LastName:  person.LastName,
			Email:     person.Email,
			AvatarURL: person.AvatarURL,
		})
	}

	directoryMu.Lock()
	directoryPeople = people
	directoryAt = time.Now()
	directoryMu.Unlock()
	return people, nil
}

func fetchDirectory(accessToken string) ([]sentinelListUser, error) {
	var tokens []string
	if token := strings.TrimSpace(accessToken); token != "" {
		tokens = append(tokens, token)
	}
	if token := sentinelServiceToken(); token != "" && token != strings.TrimSpace(accessToken) {
		tokens = append(tokens, token)
	}
	if len(tokens) == 0 {
		return nil, errNoDirectoryToken
	}

	var last error
	for _, token := range tokens {
		var people []sentinelListUser
		err := sentinelGetWithToken(token, "/api/users", &people)
		if err == nil {
			return people, nil
		}
		last = err
	}
	return nil, last
}

func filterDirectory(people []sentinelListUser, query string, limit int) []model.User {
	needle := strings.ToLower(strings.TrimSpace(query))
	if needle == "" || limit <= 0 {
		return []model.User{}
	}
	matches := make([]model.User, 0, limit)
	for _, person := range people {
		if strings.TrimSpace(person.ID) == "" {
			continue
		}
		name := strings.ToLower(strings.TrimSpace(person.FirstName + " " + person.LastName))
		username := strings.ToLower(person.Username)
		if !strings.Contains(name, needle) && !strings.Contains(username, needle) {
			continue
		}
		matches = append(matches, model.User{
			ID:        person.ID,
			EntityID:  person.EntityID,
			Username:  person.Username,
			FirstName: person.FirstName,
			LastName:  person.LastName,
			Email:     person.Email,
			AvatarURL: person.AvatarURL,
			Groups:    []string{},
		})
		if len(matches) == limit {
			break
		}
	}
	return matches
}

func applyCachedDirectoryProfile(user model.User) model.User {
	if !isSentinelUserID(user.ID) {
		if user.Groups == nil {
			user.Groups = []string{}
		}
		return user
	}
	cached, ok := cachedSentinelUser(user.ID)
	if !ok {
		if user.Groups == nil {
			user.Groups = []string{}
		}
		return user
	}
	if strings.TrimSpace(user.FirstName) == "" {
		user.FirstName = cached.FirstName
	}
	if strings.TrimSpace(user.LastName) == "" {
		user.LastName = cached.LastName
	}
	if strings.TrimSpace(user.Username) == "" {
		user.Username = cached.Username
	}
	if strings.TrimSpace(user.Email) == "" {
		user.Email = cached.Email
	}
	if strings.TrimSpace(user.AvatarURL) == "" {
		user.AvatarURL = cached.AvatarURL
	}
	if user.Groups == nil {
		user.Groups = []string{}
	}
	return user
}
