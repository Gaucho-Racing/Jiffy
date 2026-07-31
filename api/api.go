package api

import (
	"jiffy/config"
	"jiffy/model"
	"jiffy/service"
	"jiffy/utils"
	"net/http"
	"strings"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func SetupRouter() *gin.Engine {
	if config.Env == "PROD" {
		gin.SetMode(gin.ReleaseMode)
	}
	r := gin.Default()
	r.Use(cors.New(cors.Config{
		AllowAllOrigins:  true,
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Length", "Content-Type", "Authorization"},
		MaxAge:           12 * time.Hour,
		AllowCredentials: true,
	}))
	r.Use(AuthChecker())
	r.Use(UnauthorizedPanicHandler())
	return r
}

func InitializeRoutes(router *gin.Engine) {
	router.GET("/ping", Ping)
	router.POST("/auth/login", Login)
	router.GET("/users", GetAllUsers)
	router.GET("/users/@me", GetCurrentUser)
	router.GET("/users/:userID", GetUser)
	router.GET("/purchase-requests", GetAllPurchaseRequests)
	router.GET("/purchase-requests/action-required", GetActionRequiredPurchaseRequests)
	router.GET("/purchase-requests/:id", GetPurchaseRequestByID)
	router.POST("/purchase-requests", CreatePurchaseRequest)
	router.PATCH("/purchase-requests/:id", UpdatePurchaseRequestFields)
	router.PATCH("/purchase-requests/:id/status", UpdatePurchaseRequestStatus)
	router.DELETE("/purchase-requests/:id", DeletePurchaseRequest)
	router.PATCH("/purchase-requests/:id/approvals/:approvalID", EditApproval)
	router.GET("/departments", GetAllDepartments)
	router.GET("/departments/:departmentID", GetDepartmentByID)
	router.POST("/departments", CreateDepartment)
	router.POST("/departments/:departmentID/approvers/:approverID", AddApproverToDepartment)
	router.DELETE("/departments/:departmentID/approvers/:approverID", RemoveApproverFromDepartment)
	router.POST("/departments/:departmentID/budgets", AddBudgetToDepartment)
	router.DELETE("/departments/:departmentID/budgets/:budgetID", RemoveBudgetFromDepartment)
	router.GET("/shipping-addresses", GetShippingAddresses)
	router.POST("/shipping-addresses", CreateShippingAddress)
	router.DELETE("/shipping-addresses/:id", DeleteShippingAddress)
	router.POST("/purchase-requests/:id/notes", CreateNote)
	router.POST("/purchase-requests/:id/attachments", UploadAttachment)
	router.GET("/purchase-requests/:id/attachments", GetAttachments)
	router.POST("/approver-groups", CreateApproverGroup)
	router.PATCH("/approver-groups/:id", UpdateApproverGroup)
	router.DELETE("/approver-groups/:id", DeleteApproverGroup)
	router.GET("/approver-groups", GetAllApproverGroups)
	router.GET("/approver-groups/:id", GetApproverGroup)
	router.POST("/sheets", PopulateSheets)
}

func AuthChecker() gin.HandlerFunc {
	return func(c *gin.Context) {
		if c.Request.URL.Path == "/auth/login" {
			c.Next()
			return
		}

		authHeader := c.GetHeader("Authorization")
		if strings.HasPrefix(authHeader, "Bearer ") {
			token := strings.TrimPrefix(authHeader, "Bearer ")
			claims, err := service.ValidateToken(token)
			if err != nil {
				utils.SugarLogger.Errorln("Failed to validate token: " + err.Error())
				c.AbortWithStatusJSON(401, gin.H{"message": err.Error()})
				return
			}
			userID := claimString(claims, "user_id")
			if userID == "" {
				userID = claimString(claims, "sub")
			}
			utils.SugarLogger.Infof("Decoded token: entity=%s user=%s", claimString(claims, "sub"), userID)
			utils.SugarLogger.Infof("↳ Audience: %s", claimStringSliceFirst(claims, "aud"))
			utils.SugarLogger.Infof("↳ Scope: %s", claimString(claims, "scope"))
			c.Set("Auth-Token", token)
			c.Set("Auth-Claims", claims)
			c.Set("Auth-UserID", userID)
			c.Set("Auth-EntityID", claimString(claims, "sub"))
			c.Set("Auth-Audience", claimStringSliceFirst(claims, "aud"))
			c.Set("Auth-Scope", claimString(claims, "scope"))
			c.Set("Auth-Groups", claimStringSlice(claims, "groups"))
		}
		c.Next()
	}
}

func claimString(claims map[string]interface{}, key string) string {
	if claims == nil {
		return ""
	}
	value, ok := claims[key].(string)
	if !ok {
		return ""
	}
	return value
}

func claimStringSlice(claims map[string]interface{}, key string) []string {
	if claims == nil {
		return []string{}
	}
	switch value := claims[key].(type) {
	case []string:
		return value
	case []interface{}:
		result := make([]string, 0, len(value))
		for _, item := range value {
			if str, ok := item.(string); ok && str != "" {
				result = append(result, str)
			}
		}
		return result
	case string:
		if value == "" {
			return []string{}
		}
		return []string{value}
	default:
		return []string{}
	}
}

func claimStringSliceFirst(claims map[string]interface{}, key string) string {
	groups := claimStringSlice(claims, key)
	if len(groups) == 0 {
		// aud / similar may be a single string handled above; fall back
		if claims == nil {
			return ""
		}
		if s, ok := claims[key].(string); ok {
			return s
		}
		return ""
	}
	return groups[0]
}

func UnauthorizedPanicHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		defer func() {
			if err := recover(); err != nil {
				if err == "Unauthorized" {
					c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"message": "you are not authorized to access this resource"})
				} else {
					// Handle other panics
					utils.SugarLogger.Errorf("Unexpected panic: %v", err)
					c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"message": err.(string)})
				}
			}
		}()
		c.Next()
	}
}

// Require checks if a condition is true, otherwise aborts the request
func Require(c *gin.Context, condition bool) {
	if !condition {
		panic("Unauthorized")
	}
}

// Any checks if any condition is true, otherwise returns false
func Any(conditions ...bool) bool {
	for _, condition := range conditions {
		if condition {
			return true
		}
	}
	return false
}

// All checks if all conditions are true, otherwise returns false
func All(conditions ...bool) bool {
	for _, condition := range conditions {
		if !condition {
			return false
		}
	}
	return true
}

func RequestUserHasID(c *gin.Context, id string) bool {
	return GetRequestUserID(c) == id
}

func RequestUserHasEmail(c *gin.Context, email string) bool {
	return GetRequestUserEmail(c) == email
}

func RequestTokenHasGroupName(c *gin.Context, groupName string) bool {
	return model.HasGroup(GetRequestTokenGroupNames(c), groupName)
}

func RequestTokenIsInnerCircle(c *gin.Context) bool {
	return model.IsInnerCircle(GetRequestTokenGroupNames(c))
}

func RequestTokenIsAdmin(c *gin.Context) bool {
	return model.IsAdminGroup(GetRequestTokenGroupNames(c))
}

func GetRequestTokenGroupNames(c *gin.Context) []string {
	groups, exists := c.Get("Auth-Groups")
	if !exists {
		return claimStringSlice(GetRequestTokenClaims(c), "groups")
	}
	value, ok := groups.([]string)
	if !ok {
		return []string{}
	}
	return value
}

func GetRequestTokenClaims(c *gin.Context) map[string]interface{} {
	claims, exists := c.Get("Auth-Claims")
	if !exists {
		return nil
	}
	value, ok := claims.(map[string]interface{})
	if !ok {
		return nil
	}
	return value
}

func GetRequestToken(c *gin.Context) string {
	token, exists := c.Get("Auth-Token")
	if !exists {
		return ""
	}
	str, ok := token.(string)
	if !ok {
		return ""
	}
	return str
}

func GetRequestUserID(c *gin.Context) string {
	id, exists := c.Get("Auth-UserID")
	if !exists {
		return ""
	}
	return id.(string)
}

func GetRequestUserEmail(c *gin.Context) string {
	email, exists := c.Get("Auth-Email")
	if !exists {
		return ""
	}
	return email.(string)
}
