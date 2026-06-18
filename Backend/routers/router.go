package routers

import (
	"chat-widget/controllers"
	jwtmw "chat-widget/middleware"
	"os"

	"github.com/labstack/echo/v4"
)

func SetupRoutes(e *echo.Echo) {
	widgetsDir := os.Getenv("WIDGETS_DIR")
	if widgetsDir == "" {
		widgetsDir = "../Widgets"
	}
	e.Static("/api/v1/chat-widget", widgetsDir)

	// Auth
	e.POST("/api/v1/auth/login", controllers.Login)
	e.POST("/api/v1/auth/register", controllers.Register)
	e.GET("/api/v1/auth/me", controllers.Me, jwtmw.JWTMiddleware)

	// Client routes (public — used by widget)
	clientPath := "/api/v1/client/chatbot"
	msgPath := "/api/v1/client"
	e.GET(clientPath+"/script/:website_id", controllers.GetWebsiteScript)
	e.POST(clientPath+"/new_chat", controllers.StartNewChatByClient)
	e.GET(clientPath+"/chat/:chat_id", controllers.ListChatMessagesforClient)
	e.PATCH(clientPath+"/chat/:chat_id/status", controllers.UpdateChatsStatus)
	e.POST(clientPath+"/chat/:chat_id/file", controllers.ChatBotFileFromClient)
	e.GET(msgPath+"/ws/chat/:chat_id", controllers.ChatWebSocket)

	// Staff routes (JWT protected)
	staffChatbot := "/api/v1/user/:user_id/chatbot"
	staffMsg := "/api/v1/user/:user_id"
	staff := e.Group("/api/v1/user/:user_id", jwtmw.JWTMiddleware)
	_ = staff

	e.POST(staffChatbot, controllers.CreateWebsiteScript, jwtmw.JWTMiddleware)
	e.GET(staffChatbot+"/script", controllers.ListWebsiteScripts, jwtmw.JWTMiddleware)
	e.DELETE(staffChatbot+"/script/:id", controllers.DeleteWebsiteScript, jwtmw.JWTMiddleware)
	e.GET(staffMsg+"/chat/list", controllers.ListChatsForStaff, jwtmw.JWTMiddleware)
	e.GET(staffMsg+"/chat/:chat_id", controllers.ListChatMessagesforStaff, jwtmw.JWTMiddleware)
	e.PATCH(staffMsg+"/chat/:chat_id/status", controllers.UpdateChatsStatus, jwtmw.JWTMiddleware)
	e.POST(staffMsg+"/chat/:chat_id/file", controllers.ChatBotFileFromStaff, jwtmw.JWTMiddleware)
	e.PATCH(staffMsg+"/chat/:chat_id/log", controllers.UpdateStaffJoinLog, jwtmw.JWTMiddleware)
	e.PATCH(staffMsg+"/chat/:chat_id/read_status", controllers.UpdateMessageReadStatus, jwtmw.JWTMiddleware)
	e.GET(staffMsg+"/chat/overview", controllers.ChatOverviewByStaff, jwtmw.JWTMiddleware)
	e.GET(staffMsg+"/ws/chat/list", controllers.ChatListWebSocket, jwtmw.JWTMiddleware)
	e.GET(staffMsg+"/ws/chat/:chat_id", controllers.ChatWebSocket, jwtmw.JWTMiddleware)

	// Auto responses
	e.POST(staffChatbot+"/response", controllers.CreateAutoResponse, jwtmw.JWTMiddleware)
	e.GET(staffChatbot+"/response", controllers.ListAutoResponses, jwtmw.JWTMiddleware)
	e.PATCH(staffChatbot+"/response/:id", controllers.UpdateAutoResponse, jwtmw.JWTMiddleware)
	e.DELETE(staffChatbot+"/response/:id", controllers.DeleteAutoResponse, jwtmw.JWTMiddleware)
}
