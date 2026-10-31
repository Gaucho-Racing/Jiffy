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

// DirectoryUser is the slice Notify's playground keeps for its name search:
// a display name, username, and avatar. Jiffy also keeps the usr_ id because
// approver groups and reimbursement recipients are stored that way.
type DirectoryUser struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	Username  string `json:"username"`
	AvatarURL string `json:"avatar_url"`
}

// ListDirectory returns every Sentinel user for the browser to filter.
// Notify does this in GET /users, then the playground matches name or
// username locally and shows at most six hits. That Notify route is limited
// to Notify admins, so this list is loaded with the signed-in member's token.
func ListDirectory(accessToken string) ([]DirectoryUser, error) {
	people, err := loadDirectory(accessToken)
	if err != nil {
		utils.SugarLogger.Warnf("sentinel user directory unavailable: %v", err)
		return nil, err
	}
	return directorySummaries(people), nil
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

func directorySummaries(people []sentinelListUser) []DirectoryUser {
	summaries := make([]DirectoryUser, 0, len(people))
	for _, user := range people {
		if strings.TrimSpace(user.ID) == "" {
			continue
		}
		name := strings.TrimSpace(user.FirstName + " " + user.LastName)
		if name == "" {
			name = user.Username
		}
		summaries = append(summaries, DirectoryUser{
			ID:        user.ID,
			Name:      name,
			Username:  user.Username,
			AvatarURL: user.AvatarURL,
		})
	}
	sort.Slice(summaries, func(i, j int) bool {
		return strings.ToLower(summaries[i].Name) < strings.ToLower(summaries[j].Name)
	})
	return summaries
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
