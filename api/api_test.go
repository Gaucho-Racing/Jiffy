package api

import (
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
	assert.Equal(t, 1, len(router.Routes()), "There should be 1 route")
	assert.Equal(t, "/ping", router.Routes()[0].Path, "The route should be /ping")
}

func TestAuthChecker(t *testing.T) {
	router := gin.New()
	router.Use(AuthChecker())
	router.GET("/test", func(c *gin.Context) {
		c.String(200, "OK")
	})

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/test", nil)
	req.Header.Set("Authorization", "Bearer test_token")
	router.ServeHTTP(w, req)

	assert.Equal(t, 200, w.Code, "Response should be 200 OK")
}

func TestUnauthorizedPanicHandler(t *testing.T) {
	router := gin.New()
	router.Use(UnauthorizedPanicHandler())
	router.GET("/panic", func(c *gin.Context) {
		panic("Unauthorized")
	})
	router.GET("/other-panic", func(c *gin.Context) {
		panic("Some other error")
	})

	t.Run("Unauthorized Panic", func(t *testing.T) {
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("GET", "/panic", nil)
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusUnauthorized, w.Code, "Response should be 401 Unauthorized")
	})

	t.Run("Other Panic", func(t *testing.T) {
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("GET", "/other-panic", nil)
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusInternalServerError, w.Code, "Response should be 500 Internal Server Error")
	})
}

func TestRequireAll(t *testing.T) {
	router := gin.New()
	router.Use(UnauthorizedPanicHandler())
	router.GET("/test", func(c *gin.Context) {
		RequireAll(c, true, true, true)
		c.String(200, "OK")
	})
	router.GET("/fail", func(c *gin.Context) {
		RequireAll(c, true, false, true)
		c.String(200, "OK")
	})

	t.Run("All conditions met", func(t *testing.T) {
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("GET", "/test", nil)
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code, "Response should be 200 OK")
	})

	t.Run("One condition not met", func(t *testing.T) {
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("GET", "/fail", nil)
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusUnauthorized, w.Code, "Response should be 401 Unauthorized")
	})
}

func TestRequireAny(t *testing.T) {
	router := gin.New()
	router.Use(UnauthorizedPanicHandler())
	router.GET("/test", func(c *gin.Context) {
		RequireAny(c, false, true, false)
		c.String(200, "OK")
	})
	router.GET("/fail", func(c *gin.Context) {
		RequireAny(c, false, false, false)
		c.String(200, "OK")
	})

	t.Run("One condition met", func(t *testing.T) {
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("GET", "/test", nil)
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code, "Response should be 200 OK")
	})

	t.Run("No conditions met", func(t *testing.T) {
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("GET", "/fail", nil)
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusUnauthorized, w.Code, "Response should be 401 Unauthorized")
	})
}
