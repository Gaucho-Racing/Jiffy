package service

import (
	"jiffy/model"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

func TestUserString(t *testing.T) {
	user := model.User{
		ID:        "123",
		FirstName: "John",
		LastName:  "Doe",
		Email:     "john.doe@example.com",
	}
	expected := "(123) John Doe [john.doe@example.com]"
	assert.Equal(t, expected, user.String())
}

func TestUserHasRole(t *testing.T) {
	user := model.User{
		Roles: []string{"admin", "user"},
	}
	assert.True(t, user.HasRole("admin"))
	assert.True(t, user.HasRole("user"))
	assert.False(t, user.HasRole("guest"))
}

func TestUserHasSubteam(t *testing.T) {
	user := model.User{
		Subteams: []model.Subteam{
			{Name: "Team A"},
			{Name: "Team B"},
		},
	}
	assert.True(t, user.HasSubteam("Team A"))
	assert.True(t, user.HasSubteam("Team B"))
	assert.False(t, user.HasSubteam("Team C"))
}

func TestUserIsAdmin(t *testing.T) {
	adminUser := model.User{Roles: []string{"d_admin", "user"}}
	regularUser := model.User{Roles: []string{"user"}}

	assert.True(t, adminUser.IsAdmin())
	assert.False(t, regularUser.IsAdmin())
}

func TestUserIsOfficer(t *testing.T) {
	officerUser := model.User{Roles: []string{"d_officer", "user"}}
	regularUser := model.User{Roles: []string{"user"}}

	assert.True(t, officerUser.IsOfficer())
	assert.False(t, regularUser.IsOfficer())
}

func TestUserIsLead(t *testing.T) {
	leadUser := model.User{Roles: []string{"d_lead", "user"}}
	regularUser := model.User{Roles: []string{"user"}}

	assert.True(t, leadUser.IsLead())
	assert.False(t, regularUser.IsLead())
}

func TestUserIsInnerCircle(t *testing.T) {
	adminUser := model.User{Roles: []string{"d_admin"}}
	officerUser := model.User{Roles: []string{"d_officer"}}
	leadUser := model.User{Roles: []string{"d_lead"}}
	regularUser := model.User{Roles: []string{"user"}}

	assert.True(t, adminUser.IsInnerCircle())
	assert.True(t, officerUser.IsInnerCircle())
	assert.True(t, leadUser.IsInnerCircle())
	assert.False(t, regularUser.IsInnerCircle())
}

func TestUserFields(t *testing.T) {
	now := time.Now()
	user := model.User{
		ID:                    "123",
		Username:              "johndoe",
		FirstName:             "John",
		LastName:              "Doe",
		Email:                 "john.doe@example.com",
		PhoneNumber:           "1234567890",
		Gender:                "Male",
		Birthday:              "1990-01-01",
		GraduateLevel:         "Bachelor",
		GraduationYear:        2023,
		Major:                 "Computer Science",
		ShirtSize:             "M",
		JacketSize:            "L",
		SAERegistrationNumber: "SAE123456",
		AvatarURL:             "https://example.com/avatar.jpg",
		Verified:              true,
		Subteams:              []model.Subteam{{Name: "Team A"}},
		Roles:                 []string{"user"},
		UpdatedAt:             now,
		CreatedAt:             now,
	}

	assert.Equal(t, "123", user.ID)
	assert.Equal(t, "johndoe", user.Username)
	assert.Equal(t, "John", user.FirstName)
	assert.Equal(t, "Doe", user.LastName)
	assert.Equal(t, "john.doe@example.com", user.Email)
	assert.Equal(t, "1234567890", user.PhoneNumber)
	assert.Equal(t, "Male", user.Gender)
	assert.Equal(t, "1990-01-01", user.Birthday)
	assert.Equal(t, "Bachelor", user.GraduateLevel)
	assert.Equal(t, 2023, user.GraduationYear)
	assert.Equal(t, "Computer Science", user.Major)
	assert.Equal(t, "M", user.ShirtSize)
	assert.Equal(t, "L", user.JacketSize)
	assert.Equal(t, "SAE123456", user.SAERegistrationNumber)
	assert.Equal(t, "https://example.com/avatar.jpg", user.AvatarURL)
	assert.True(t, user.Verified)
	assert.Equal(t, "Team A", user.Subteams[0].Name)
	assert.Equal(t, "user", user.Roles[0])
	assert.Equal(t, now, user.UpdatedAt)
	assert.Equal(t, now, user.CreatedAt)
}
