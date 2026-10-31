package service

import (
	"testing"
	"time"
)

func TestPurchaseRequestYearStartsSeptemberFirst(t *testing.T) {
	// 2026-09-01 06:59 UTC is still 2025-08-31 in Pacific Daylight Time.
	before := time.Date(2026, time.September, 1, 6, 59, 0, 0, time.UTC)
	if got := PurchaseRequestYear(before); got != 2025 {
		t.Fatalf("PurchaseRequestYear(%s) = %d, want 2025", before, got)
	}

	// 2026-09-01 07:00 UTC is 2026-09-01 00:00 PDT, the start of academic year 2026.
	start := time.Date(2026, time.September, 1, 7, 0, 0, 0, time.UTC)
	if got := PurchaseRequestYear(start); got != 2026 {
		t.Fatalf("PurchaseRequestYear(%s) = %d, want 2026", start, got)
	}

	// January still belongs to the academic year that started the previous September.
	january := time.Date(2026, time.January, 15, 20, 0, 0, 0, time.UTC)
	if got := PurchaseRequestYear(january); got != 2025 {
		t.Fatalf("PurchaseRequestYear(%s) = %d, want 2025", january, got)
	}

	october := time.Date(2026, time.October, 31, 19, 0, 0, 0, time.UTC)
	if got := PurchaseRequestYear(october); got != 2026 {
		t.Fatalf("PurchaseRequestYear(%s) = %d, want 2026", october, got)
	}
}

func TestPurchaseRequestYearZeroUsesCurrentYear(t *testing.T) {
	if got := PurchaseRequestYear(time.Time{}); got != CurrentPurchaseRequestYear() {
		t.Fatalf("zero time year = %d, want current %d", got, CurrentPurchaseRequestYear())
	}
}
