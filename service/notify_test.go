package service

import (
	"encoding/json"
	"strings"
	"testing"
)

func TestDiscordDMBodyTargetsEntity(t *testing.T) {
	body := discordDMBody("ent_123", "please approve")
	raw, err := json.Marshal(body)
	if err != nil {
		t.Fatal(err)
	}
	var decoded map[string]any
	if err := json.Unmarshal(raw, &decoded); err != nil {
		t.Fatal(err)
	}
	if decoded["channel"] != "DISCORD" {
		t.Fatalf("channel = %v", decoded["channel"])
	}
	recipients := decoded["recipients"].(map[string]any)
	ids := recipients["entity_ids"].([]any)
	if len(ids) != 1 || ids[0] != "ent_123" {
		t.Fatalf("entity_ids = %v", ids)
	}
	discord := decoded["discord"].(map[string]any)
	if discord["content"] != "please approve" {
		t.Fatalf("content = %v", discord["content"])
	}
}

func TestRewriteDiscordMention(t *testing.T) {
	content := "<@usr_abc> needs your approval"
	got := rewriteDiscordMention(content, "usr_abc", "123456789012345678")
	if !strings.Contains(got, "<@123456789012345678>") {
		t.Fatalf("mention not rewritten: %s", got)
	}
	if strings.Contains(got, "usr_abc") {
		t.Fatalf("sentinel id still mentioned: %s", got)
	}

	same := rewriteDiscordMention("<@999> hi", "999", "999")
	if same != "<@999> hi" {
		t.Fatalf("snowflake mention changed: %s", same)
	}
}
