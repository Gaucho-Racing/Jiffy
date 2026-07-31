package model

// UnmigratedUser is a Discord-era identity that was never remapped to a
// Sentinel usr_ id. Used only for display of leftover snowflake IDs.
type UnmigratedUser struct {
	ID        string `gorm:"primaryKey" json:"id"`
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
	Email     string `json:"email"`
}

func (UnmigratedUser) TableName() string {
	return "unmigrated_users"
}

// AsUser returns a Sentinel-shaped User with (Unmigrated) markers.
func (u UnmigratedUser) AsUser() User {
	return User{
		ID:        u.ID,
		FirstName: u.FirstName,
		LastName:  u.LastName + " (Unmigrated)",
		Email:     "(" + u.Email + " Unmigrated)",
		Groups:    []string{},
	}
}
