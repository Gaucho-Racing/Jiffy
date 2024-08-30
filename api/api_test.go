package api

import (
	"encoding/json"
	"jiffy/config"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

func TestSetupRouter(t *testing.T) {
	config.Env = "DEV"
	router := SetupRouter()
	assert.NotNil(t, router, "Router should not be nil")

	config.Env = "PROD"
	router = SetupRouter()
	assert.NotNil(t, router, "Router should not be nil")
}

func TestInitializeRoutes(t *testing.T) {
	router := gin.New()
	InitializeRoutes(router)

	assert.NotNil(t, router.Routes(), "Routes should be initialized")
	expectedRoutes := []string{"/ping", "/auth/login", "/users", "/users/@me", "/users/:userID"}
	for _, route := range expectedRoutes {
		assert.True(t, routeExists(router, route), "Route %s should exist", route)
	}
}

func TestAuthChecker(t *testing.T) {
	gin.SetMode(gin.TestMode)

	// Set up a valid token in the config
	invalidToken := "invalid_token"

	router := gin.New()
	router.Use(AuthChecker())
	router.GET("/test", func(c *gin.Context) {
		c.String(200, "OK")
	})

	t.Run("Valid Token", func(t *testing.T) {
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("GET", "/test", nil)
		req.Header.Set("Authorization", "Bearer "+config.Sentinel.Token)
		router.ServeHTTP(w, req)

		assert.Equal(t, 200, w.Code)
	})

	t.Run("Invalid Token", func(t *testing.T) {
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("GET", "/test", nil)
		req.Header.Set("Authorization", "Bearer "+invalidToken)
		router.ServeHTTP(w, req)

		assert.Equal(t, 401, w.Code)
	})
}

func TestUnauthorizedPanicHandler(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.Use(UnauthorizedPanicHandler())
	router.GET("/unauthorized", func(c *gin.Context) {
		panic("Unauthorized")
	})
	router.GET("/other-error", func(c *gin.Context) {
		panic("Some other error")
	})

	t.Run("Unauthorized Panic", func(t *testing.T) {
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("GET", "/unauthorized", nil)
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusUnauthorized, w.Code)
		var response map[string]string
		json.Unmarshal(w.Body.Bytes(), &response)
		assert.Equal(t, "you are not authorized to access this resource", response["message"])
	})

	t.Run("Other Panic", func(t *testing.T) {
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("GET", "/other-error", nil)
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusInternalServerError, w.Code)
		var response map[string]string
		json.Unmarshal(w.Body.Bytes(), &response)
		assert.Equal(t, "Some other error", response["message"])
	})
}

func TestRequire(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.Use(UnauthorizedPanicHandler())
	router.GET("/test", func(c *gin.Context) {
		Require(c, false)
		c.String(200, "OK")
	})

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/test", nil)
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
}

func TestAny(t *testing.T) {
	assert.True(t, Any(true, false, false))
	assert.True(t, Any(false, true, false))
	assert.False(t, Any(false, false, false))
}

func TestAll(t *testing.T) {
	assert.True(t, All(true, true, true))
	assert.False(t, All(true, false, true))
	assert.False(t, All(false, false, false))
}

func TestRequestUserFunctions(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	t.Run("With User Data", func(t *testing.T) {
		router.GET("/test", func(c *gin.Context) {
			c.Set("Auth-UserID", "user123")
			c.Set("Auth-Email", "user@example.com")
			assert.True(t, RequestUserHasID(c, "user123"))
			assert.False(t, RequestUserHasID(c, "user456"))
			assert.True(t, RequestUserHasEmail(c, "user@example.com"))
			assert.False(t, RequestUserHasEmail(c, "other@example.com"))
			assert.Equal(t, "user123", GetRequestUserID(c))
			assert.Equal(t, "user@example.com", GetRequestUserEmail(c))
			c.String(200, "OK")
		})
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("GET", "/test", nil)
		router.ServeHTTP(w, req)
		assert.Equal(t, 200, w.Code)
	})
	t.Run("With Empty Results", func(t *testing.T) {
		router.GET("/empty", func(c *gin.Context) {
			assert.False(t, RequestUserHasID(c, "any_id"))
			assert.False(t, RequestUserHasEmail(c, "any@email.com"))
			assert.Equal(t, "", GetRequestUserID(c))
			assert.Equal(t, "", GetRequestUserEmail(c))
			c.String(200, "OK")
		})
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("GET", "/empty", nil)
		router.ServeHTTP(w, req)
		assert.Equal(t, 200, w.Code)
	})
}

// Helper function to check if a route exists
func routeExists(router *gin.Engine, path string) bool {
	for _, route := range router.Routes() {
		if route.Path == path {
			return true
		}
	}
	return false
}
