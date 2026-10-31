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

// PurchaseRequestYear is the calendar year of t in Pacific Time, which is how
// Jiffy separates seasons. Records are stored with created_at; the year column
// is that timestamp's year and is not a separate school-year calendar.
func PurchaseRequestYear(t time.Time) int {
	if t.IsZero() {
		return CurrentPurchaseRequestYear()
	}
	return t.In(purchaseRequestLocation).Year()
}

// CurrentPurchaseRequestYear is the year new purchase requests belong to.
func CurrentPurchaseRequestYear() int {
	return time.Now().In(purchaseRequestLocation).Year()
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

// BackfillPurchaseRequestYears sets year from created_at for rows that
// predate the column. Zero means unset; a real year is never zero.
func BackfillPurchaseRequestYears() error {
	return database.DB.Exec(`
		UPDATE purchase_request
		SET year = EXTRACT(YEAR FROM created_at AT TIME ZONE 'America/Los_Angeles')::int
		WHERE year = 0
	`).Error
}
