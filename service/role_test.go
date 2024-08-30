package service

import (
	"jiffy/database"
	"jiffy/model"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestGetRolesForUser(t *testing.T) {
	ResetDB()

	// Test with no roles
	roles := GetRolesForUser("user1")
	assert.Empty(t, roles)

	// Add roles and test
	database.DB.Create(&model.UserRole{UserID: "user1", Role: "admin"})
	database.DB.Create(&model.UserRole{UserID: "user1", Role: "user"})

	roles = GetRolesForUser("user1")
	assert.ElementsMatch(t, []string{"admin", "user"}, roles)

	// Test with non-existent user
	roles = GetRolesForUser("user2")
	assert.Empty(t, roles)
}

func TestSetRolesForUser(t *testing.T) {
	ResetDB()

	// Set initial roles
	roles := SetRolesForUser("user1", []string{"admin", "user"})
	assert.ElementsMatch(t, []string{"admin", "user"}, roles)

	// Update roles (add one, remove one)
	roles = SetRolesForUser("user1", []string{"user", "moderator"})
	assert.ElementsMatch(t, []string{"user", "moderator"}, roles)

	// Set empty roles
	roles = SetRolesForUser("user1", []string{})
	assert.Empty(t, roles)

	// Set roles for a new user
	roles = SetRolesForUser("user2", []string{"user"})
	assert.ElementsMatch(t, []string{"user"}, roles)
}

func TestContains(t *testing.T) {
	assert.True(t, contains([]string{"a", "b", "c"}, "b"))
	assert.False(t, contains([]string{"a", "b", "c"}, "d"))
	assert.False(t, contains([]string{}, "a"))
}
