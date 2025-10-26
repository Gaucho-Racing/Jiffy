package service

import (
	"context"
	"encoding/base64"
	"fmt"
	"jiffy/config"
	"jiffy/model"
	"jiffy/utils"
	"log"

	"strconv"

	"golang.org/x/oauth2/google"
	"google.golang.org/api/drive/v3"
	"google.golang.org/api/option"
	"google.golang.org/api/sheets/v4"
)

var SheetClient *sheets.Service

func InitializeDrive() {
	ctx := context.Background()
	decoded, err := base64.StdEncoding.DecodeString(config.DriveServiceAccount)
	if err != nil {
		utils.SugarLogger.Fatalln("Error decoding service account: %v\n", err)
	}
	creds, err := google.CredentialsFromJSON(ctx, []byte(decoded), drive.DriveScope)
	if err != nil {
		log.Fatalf("Unable to parse client secret file to config: %v", err)
	}

	srv, err := sheets.NewService(ctx, option.WithCredentials(creds))
	if err != nil {
		log.Fatalf("Unable to create Sheets service: %v", err)
	}
	SheetClient = srv
}

func PopulateGR26PurchaseRequestsSheet() {
	// Helper function to clear and populate a sheet
	populateSheet := func(sheetName string, purchaseRequests []model.PurchaseRequest) {
		// Get sheet ID by name
		spreadsheet, err := SheetClient.Spreadsheets.Get(config.GR26PurchaseRequestsSheetID).Do()
		if err != nil {
			utils.SugarLogger.Errorf("Unable to get spreadsheet: %v", err)
			return
		}

		sheetId := -1
		for _, sheet := range spreadsheet.Sheets {
			if sheet.Properties.Title == sheetName {
				utils.SugarLogger.Infof("Found sheet %s: %v", sheet.Properties.Title, sheet.Properties.SheetId)
				sheetId = int(sheet.Properties.SheetId)
				break
			}
		}
		if sheetId == -1 {
			utils.SugarLogger.Errorf("Sheet %s not found", sheetName)
			return
		}

		// Clear existing data using sheet ID
		clearRequest := &sheets.BatchUpdateSpreadsheetRequest{
			Requests: []*sheets.Request{
				{
					UpdateCells: &sheets.UpdateCellsRequest{
						Range: &sheets.GridRange{
							SheetId:          int64(sheetId),
							StartRowIndex:    5,  // A6 starts at index 5
							StartColumnIndex: 1,  // B column
							EndColumnIndex:   19, // T column
						},
						Fields: "userEnteredValue",
					},
				},
			},
		}

		_, err = SheetClient.Spreadsheets.BatchUpdate(config.GR26PurchaseRequestsSheetID, clearRequest).Do()
		if err != nil {
			utils.SugarLogger.Errorf("Unable to clear data from sheet %s: %v", sheetName, err)
			return
		}
		totalNumItems := 0
		for _, purchaseRequest := range purchaseRequests {
			totalNumItems += len(purchaseRequest.Items)
		}
		// Prepare values
		itemIndex := 0
		values := make([][]interface{}, totalNumItems)
		for _, purchaseRequest := range purchaseRequests {
			numItems := len(purchaseRequest.Items)
			values[itemIndex] = []interface{}{
				fmt.Sprintf("=HYPERLINK(\"https://jiffy.gauchoracing.com/pr/%d\",\"%d\")", purchaseRequest.ID, purchaseRequest.ID),
				purchaseRequest.User.FirstName + " " + purchaseRequest.User.LastName,
				purchaseRequest.DepartmentID,
				purchaseRequest.Component,
				purchaseRequest.CreatedAt.Format("01/02/2006"),
				purchaseRequest.Description,
				purchaseRequest.Vendor,
				"1",
				purchaseRequest.Items[0].Name,
				purchaseRequest.Items[0].URL,
				purchaseRequest.Items[0].Quantity,
				fmt.Sprintf("$%.2f", float64(purchaseRequest.Items[0].UnitPriceCents)/100),
				fmt.Sprintf("$%.2f", float64(purchaseRequest.ShippingTaxCostCents)/100),
				fmt.Sprintf("$%.2f", float64(purchaseRequest.EstimatedCostCents)/100),
				fmt.Sprintf("$%.2f", float64(purchaseRequest.FinalCostCents)/100),
				purchaseRequest.NeededByDate.Format("01/02/2006"),
				purchaseRequest.Priority,
				purchaseRequest.Status,
				purchaseRequest.RequestedPurchaser,
			}
			for i := 1; i < numItems; i++ {
				values[itemIndex+i] = []interface{}{
					fmt.Sprintf("=HYPERLINK(\"https://jiffy.gauchoracing.com/pr/%d\",\"%d\")", purchaseRequest.ID, purchaseRequest.ID),
					purchaseRequest.User.FirstName + " " + purchaseRequest.User.LastName,
					purchaseRequest.DepartmentID,
					purchaseRequest.Component,
					purchaseRequest.CreatedAt.Format("01/02/2006"),
					purchaseRequest.Description,
					purchaseRequest.Vendor,
					strconv.Itoa(i + 1),
					purchaseRequest.Items[i].Name,
					purchaseRequest.Items[i].URL,
					purchaseRequest.Items[i].Quantity,
					fmt.Sprintf("$%.2f", float64(purchaseRequest.Items[i].UnitPriceCents)/100),
					"↳",
					"↳",
					"↳",
					purchaseRequest.NeededByDate.Format("01/02/2006"),
					purchaseRequest.Priority,
					purchaseRequest.Status,
					purchaseRequest.RequestedPurchaser,
				}
			}
			itemIndex += numItems
		}

		// Write data (can still use A1 notation for updates as it's more convenient)
		writeRange := fmt.Sprintf("'%s'!B6:T", sheetName)
		writeRequest := &sheets.ValueRange{
			Values: values,
		}
		_, err = SheetClient.Spreadsheets.Values.Update(config.GR26PurchaseRequestsSheetID, writeRange, writeRequest).
			ValueInputOption("USER_ENTERED").
			Do()
		if err != nil {
			utils.SugarLogger.Errorf("Unable to write data to sheet %s: %v", sheetName, err)
			return
		}

		utils.SugarLogger.Infof("Successfully populated %s sheet with %d purchase requests", sheetName, len(purchaseRequests))
		// SendMessage(config.DiscordLogChannel, fmt.Sprintf("Successfully populated `%s` sheet with %d purchase requests", sheetName, len(purchaseRequests)))
	}

	var pendingPurchaseRequests []model.PurchaseRequest
	departmentPRs := make(map[string][]model.PurchaseRequest)
	departments, _ := GetAllDepartments()
	for _, dept := range departments {
		departmentPRs[dept.ID] = []model.PurchaseRequest{}
	}

	allPurchaseRequests := GetAllPurchaseRequests()
	for i, j := 0, len(allPurchaseRequests)-1; i < j; i, j = i+1, j-1 {
		allPurchaseRequests[i], allPurchaseRequests[j] = allPurchaseRequests[j], allPurchaseRequests[i]
	}

	for _, purchaseRequest := range allPurchaseRequests {
		if purchaseRequest.Status == model.PurchaseRequestPending || purchaseRequest.Status == model.PurchaseRequestRejected {
			pendingPurchaseRequests = append(pendingPurchaseRequests, purchaseRequest)
		} else {
			departmentPRs[purchaseRequest.DepartmentID] = append(departmentPRs[purchaseRequest.DepartmentID], purchaseRequest)
		}
	}

	// Populate Sheets
	populateSheet("Pending and Rejected", pendingPurchaseRequests)
	for _, dept := range departments {
		populateSheet(dept.Name, departmentPRs[dept.ID])
	}

}
