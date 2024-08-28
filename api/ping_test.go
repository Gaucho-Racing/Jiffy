package api

import (
	"jiffy/config"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestPing(t *testing.T) {
	router := SetupRouter()
	InitializeRoutes(router)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/ping", nil)
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code, "Response should be 200 OK")
	assert.Contains(t, w.Body.String(), "Jiffy v"+config.Version+" is online!", "Response should contain version information")
}
