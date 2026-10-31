package service

import (
	"errors"
	"jiffy/database"
	"jiffy/model"
	"time"
)

// ErrPriorYearReadOnly is returned when a mutation targets a purchase request
// from a year other than the current one.
var ErrPriorYearReadOnly = errors.New("purchase requests from prior years are read-only")

var purchaseRequestLocation = func() *time.Location {
	loc, err := time.LoadLocation("America/Los_Angeles")
	if err != nil {
		return time.FixedZone("America/Los_Angeles", -8*60*60)
	}
	return loc
}()

// PurchaseRequestYear is the academic year of t in Pacific Time. A new year
// starts every September 1. The stored number is the September it started, so
// October 2026 and May 2027 are both 2026 (the 2026–27 season).
func PurchaseRequestYear(t time.Time) int {
	if t.IsZero() {
		return CurrentPurchaseRequestYear()
	}
	return academicYear(t)
}

// CurrentPurchaseRequestYear is the year new purchase requests belong to.
func CurrentPurchaseRequestYear() int {
	return academicYear(time.Now())
}

func academicYear(t time.Time) int {
	local := t.In(purchaseRequestLocation)
	year := local.Year()
	if local.Month() < time.September {
		year--
	}
	return year
}

// EffectivePurchaseRequestYear uses the stored year, or created_at when a row
// has not been backfilled yet.
func EffectivePurchaseRequestYear(pr model.PurchaseRequest) int {
	if pr.Year != 0 {
		return pr.Year
	}
	return PurchaseRequestYear(pr.CreatedAt)
}

// AnnotatePurchaseRequest fills year and editable for API responses.
func AnnotatePurchaseRequest(pr *model.PurchaseRequest) {
	if pr == nil {
		return
	}
	pr.Year = EffectivePurchaseRequestYear(*pr)
	pr.Editable = pr.Year == CurrentPurchaseRequestYear()
}

// EnsureCurrentPurchaseRequestYear rejects mutations of prior-year requests.
func EnsureCurrentPurchaseRequestYear(prID int) error {
	var pr model.PurchaseRequest
	if err := database.DB.Select("id", "year", "created_at").First(&pr, "id = ?", prID).Error; err != nil {
		return err
	}
	if EffectivePurchaseRequestYear(pr) != CurrentPurchaseRequestYear() {
		return ErrPriorYearReadOnly
	}
	return nil
}
