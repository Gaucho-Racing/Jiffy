package service

import "testing"

func TestDiscordAvatarURL(t *testing.T) {
	if got := discordAvatarURL("42", ""); got != discordDefaultAvatarURL("42") {
		t.Fatalf("empty hash = %s", got)
	}
	got := discordAvatarURL("42", "abc")
	if got != "https://cdn.discordapp.com/avatars/42/abc.png" {
		t.Fatalf("png avatar = %s", got)
	}
	animated := discordAvatarURL("42", "a_abc")
	if animated != "https://cdn.discordapp.com/avatars/42/a_abc.gif" {
		t.Fatalf("gif avatar = %s", animated)
	}
}

func TestDiscordDefaultAvatarIndex(t *testing.T) {
	// 1 << 22 is index 1.
	if got := discordDefaultAvatarURL("4194304"); got != "https://cdn.discordapp.com/embed/avatars/1.png" {
		t.Fatalf("index = %s", got)
	}
}
