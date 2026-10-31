package service

import "testing"

func TestDirectorySummariesMatchNotifyList(t *testing.T) {
	people := []sentinelListUser{
		{ID: "usr_b", FirstName: "Grace", LastName: "Hopper", Username: "grace"},
		{ID: "usr_a", FirstName: "Ada", LastName: "Lovelace", Username: "ada", AvatarURL: "https://example/ada.png"},
		{ID: "", FirstName: "Skip", LastName: "Me", Username: "skip"},
		{ID: "usr_c", Username: "noname"},
	}

	got := directorySummaries(people)
	if len(got) != 3 {
		t.Fatalf("len = %d, want 3: %+v", len(got), got)
	}
	if got[0].ID != "usr_a" || got[0].Name != "Ada Lovelace" || got[0].AvatarURL == "" {
		t.Fatalf("first = %+v", got[0])
	}
	if got[1].Name != "Grace Hopper" {
		t.Fatalf("second = %+v", got[1])
	}
	if got[2].ID != "usr_c" || got[2].Name != "noname" {
		t.Fatalf("username fallback = %+v", got[2])
	}
}
