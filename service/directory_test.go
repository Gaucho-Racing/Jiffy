package service

import "testing"

func TestFilterDirectoryByNameOrUsername(t *testing.T) {
	people := []sentinelListUser{
		{ID: "usr_a", FirstName: "Ada", LastName: "Lovelace", Username: "ada"},
		{ID: "usr_b", FirstName: "Grace", LastName: "Hopper", Username: "grace"},
		{ID: "usr_c", FirstName: "Alan", LastName: "Turing", Username: "turing"},
		{ID: "", FirstName: "Skip", LastName: "Me", Username: "skip"},
	}

	byName := filterDirectory(people, "lovelace", 6)
	if len(byName) != 1 || byName[0].ID != "usr_a" {
		t.Fatalf("name search = %+v", byName)
	}

	byUsername := filterDirectory(people, "TUR", 6)
	if len(byUsername) != 1 || byUsername[0].Username != "turing" {
		t.Fatalf("username search = %+v", byUsername)
	}

	limited := filterDirectory(people, "a", 1)
	if len(limited) != 1 {
		t.Fatalf("limit = %d, want 1", len(limited))
	}

	if got := filterDirectory(people, "   ", 6); len(got) != 0 {
		t.Fatalf("blank query returned %d users", len(got))
	}
}
