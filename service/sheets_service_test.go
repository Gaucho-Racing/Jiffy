package service

import (
	"encoding/base64"
	"testing"
)

func TestDecodeServiceAccountAcceptsJSONAndBase64(t *testing.T) {
	raw := `{"type":"service_account"}`
	for _, input := range []string{raw, "\n" + raw + "\n", base64.StdEncoding.EncodeToString([]byte(raw))} {
		got, err := decodeServiceAccount(input)
		if err != nil || string(got) != raw {
			t.Fatalf("decodeServiceAccount(%q) = %q, %v", input, got, err)
		}
	}
}
