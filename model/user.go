package model

// User mirrors Sentinel's /api/users payload (Vault-style DTO — not a GORM table).
type User struct {
	ID                    string   `json:"id"`
	EntityID              string   `json:"entity_id"`
	Username              string   `json:"username"`
	FirstName             string   `json:"first_name"`
	LastName              string   `json:"last_name"`
	Email                 string   `json:"email"`
	PhoneNumber           string   `json:"phone_number"`
	Gender                string   `json:"gender"`
	Birthday              string   `json:"birthday"`
	GraduateLevel         string   `json:"graduate_level"`
	GraduationYear        int      `json:"graduation_year"`
	Major                 string   `json:"major"`
	ShirtSize             string   `json:"shirt_size"`
	JacketSize            string   `json:"jacket_size"`
	SAERegistrationNumber string   `json:"sae_registration_number"`
	OccupationTitle       string   `json:"occupation_title"`
	OccupationCompany     string   `json:"occupation_company"`
	AvatarURL             string   `json:"avatar_url"`
	InitialRole           string   `json:"initial_role"`
	Groups                []string `json:"groups"`
	UpdatedAt             string   `json:"updated_at"`
	CreatedAt             string   `json:"created_at"`
}

func (user User) String() string {
	return "(" + user.ID + ")" + " " + user.FirstName + " " + user.LastName + " [" + user.Email + "]"
}

func (user User) HasGroup(group string) bool {
	return HasGroup(user.Groups, group)
}

func (user User) IsAdmin() bool {
	return user.HasGroup("Admins")
}

func (user User) IsOfficer() bool {
	return user.HasGroup("Officers")
}

func (user User) IsLead() bool {
	return user.HasGroup("Leads")
}

func (user User) IsInnerCircle() bool {
	return IsInnerCircle(user.Groups)
}

// HasGroup reports whether groups contains name.
func HasGroup(groups []string, name string) bool {
	for _, g := range groups {
		if g == name {
			return true
		}
	}
	return false
}

// IsInnerCircle is Admins, Officers, or Leads (replaces old d_* roles).
func IsInnerCircle(groups []string) bool {
	return HasGroup(groups, "Admins") || HasGroup(groups, "Officers") || HasGroup(groups, "Leads")
}

// IsAdminGroup reports whether groups includes Admins.
func IsAdminGroup(groups []string) bool {
	return HasGroup(groups, "Admins")
}
