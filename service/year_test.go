package service

import (
	"testing"
	"time"
)

func TestPurchaseRequestYearUsesPacificTime(t *testing.T) {
	// 2026-01-01 07:30 UTC is still 2025-12-31 in Pacific Time.
	newYearUTC := time.Date(2026, time.January, 1, 7, 30, 0, 0, time.UTC)
	if got := PurchaseRequestYear(newYearUTC); got != 2025 {
		t.Fatalf("PurchaseRequestYear(%s) = %d, want 2025", newYearUTC, got)
	}

	// 2026-01-01 08:00 UTC is 2026-01-01 00:00 PST.
	pacificNewYear := time.Date(2026, time.January, 1, 8, 0, 0, 0, time.UTC)
	if got := PurchaseRequestYear(pacificNewYear); got != 2026 {
		t.Fatalf("PurchaseRequestYear(%s) = %d, want 2026", pacificNewYear, got)
	}
}

func TestPurchaseRequestYearZeroUsesCurrentYear(t *testing.T) {
	if got := PurchaseRequestYear(time.Time{}); got != CurrentPurchaseRequestYear() {
		t.Fatalf("zero time year = %d, want current %d", got, CurrentPurchaseRequestYear())
	}
}
