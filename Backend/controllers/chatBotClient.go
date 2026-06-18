package controllers

import (
	"chat-widget/config"
	"chat-widget/models"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"github.com/gorilla/websocket"
	"github.com/labstack/echo/v4"
	"gorm.io/gorm"
)

func StartNewChatByClient(c echo.Context) error {
	var existing models.ChatBotClient
	var fullClient models.ChatBotClient
	var websiteScript models.WebsiteScript
	var clientID uint
	type Input struct {
		Name        string `json:"name"`
		Email       string `json:"email"`
		Department  string `json:"department"`
		WebsiteID   string `json:"website_id"`
		Description string `json:"description"`
		IpAddress   string `json:"ip_address"`
		Country     string `json:"country"`
		Browser     string `json:"browser"`
		Device      string `json:"device"`
		CurrentPage string `json:"current_page"`
	}
	var input Input
	if err := c.Bind(&input); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]interface{}{
			"success": false,
			"error":   "Invalid input",
		})
	}
	if err := config.DB.Where("website_id = ?", input.WebsiteID).First(&websiteScript).Error; err != nil {
		return c.JSON(http.StatusBadRequest, map[string]interface{}{
			"success": false,
			"error":   "Invalid website id",
		})
	}
	err := config.DB.Where("email = ?", input.Email).First(&existing).Error
	if err != nil {
		newClient := models.ChatBotClient{Name: input.Name, Email: input.Email}
		if err := config.DB.Create(&newClient).Error; err != nil {
			return c.JSON(http.StatusBadRequest, map[string]interface{}{
				"success": false,
				"error":   "Failed to create client",
			})
		}
		clientID = newClient.ID
	} else {
		clientID = existing.ID
	}
	clientChat := models.ChatBotChats{
		ClientID:    clientID,
		ClientName:  input.Name,
		WebsiteID:   input.WebsiteID,
		Department:  input.Department,
		Description: input.Description,
		IpAddress:   input.IpAddress,
		Country:     input.Country,
		Browser:     input.Browser,
		Device:      input.Device,
		Status:      "created",
	}
	if err := config.DB.Create(&clientChat).Error; err != nil {
		return c.JSON(http.StatusBadRequest, map[string]interface{}{
			"success": false,
			"error":   "Failed to create client detail",
		})
	}
	chat := models.Messages{
		Messager:    "client",
		MessageBy:   input.Name,
		MessageType: "public message",
		ClientID:    &clientID,
		ChatID:      clientChat.ID,
		Message:     input.Description,
		CurrentPage: &input.CurrentPage,
	}
	if err := config.DB.Create(&chat).Error; err != nil {
		return c.JSON(http.StatusBadRequest, map[string]interface{}{
			"success": false,
			"error":   "Failed to create chat",
		})
	}
	type ChatWithExtras struct {
		models.ChatBotChats
		Preview  *string `json:"preview"`
		Attended *string `json:"attended"`
	}
	var chats ChatWithExtras
	if err := config.DB.Model(&models.ChatBotChats{}).
		Select(`chat_bot_chats.*, u.name AS attended,
			CASE
				WHEN client_msg.message IS NOT NULL AND client_msg.message != '' AND TRIM(client_msg.message) != '' THEN client_msg.message
				WHEN TRIM(client_msg.file_path) ~* '\.(png|jpg|jpeg|webp|gif)$' THEN 'shared a image'
				WHEN TRIM(client_msg.file_path) ~* '\.(mp4|mov|avi|mkv|webm|flv)$' THEN 'shared a video'
				WHEN TRIM(client_msg.file_path) ~* '\.(mp3|wav|aac|m4a|ogg|flac|wma|amr|m4p)$' THEN 'shared a audio'
				WHEN TRIM(client_msg.file_path) ~* '\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt)$' THEN 'shared a document'
				WHEN client_msg.file_path IS NOT NULL AND TRIM(client_msg.file_path) != '' THEN 'shared a file'
				ELSE ''
			END AS preview`).
		Joins(`LEFT JOIN (
			SELECT DISTINCT ON (chat_id) chat_id, message, file_path
			FROM messages WHERE messager = 'client' ORDER BY chat_id, id DESC
		) client_msg ON client_msg.chat_id = chat_bot_chats.id`).
		Joins(`LEFT JOIN (
			SELECT DISTINCT ON (chat_id) chat_id, user_id
			FROM messages WHERE messager = 'employee' ORDER BY chat_id, id DESC
		) staff_msg ON staff_msg.chat_id = chat_bot_chats.id`).
		Joins(`LEFT JOIN users u ON u.id = staff_msg.user_id`).
		Preload("Client").
		Preload("Website").
		Where("chat_bot_chats.id = ?", clientChat.ID).
		First(&chats).Error; err != nil {
		return c.JSON(http.StatusBadRequest, map[string]interface{}{
			"success": false,
			"error":   "Failed to fetch chat",
		})
	}
	SendToList(map[string]interface{}{
		"type":    "chat-list-update",
		"chat_id": clientChat.ID,
		"data":    chats,
	})
	if err := config.DB.
		Preload("Chats", "id = ?", clientChat.ID).
		Preload("Chats.Website").
		Preload("Chats.Messages").
		Where("id = ?", clientID).
		First(&fullClient).Error; err != nil {
		return c.JSON(http.StatusBadRequest, map[string]interface{}{
			"success": false,
			"error":   "Failed to fetch client data",
		})
	}
	return c.JSON(http.StatusOK, map[string]interface{}{
		"success": true,
		"data":    fullClient,
	})
}

func handleClientMessage(conn *websocket.Conn, connection ClientConnection) error {
	var chat models.ChatBotChats
	var incoming struct {
		Message     string `json:"message"`
		CurrentPage string `json:"current_page"`
	}
	if err := conn.ReadJSON(&incoming); err != nil {
		return fmt.Errorf("failed to read client message")
	}
	if strings.TrimSpace(incoming.Message) == "" {
		return fmt.Errorf("client message cannot be empty")
	}
	if err := config.DB.Preload("Client").Preload("Messages").Where("id = ?", connection.ChatID).First(&chat).Error; err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return fmt.Errorf("failed to get client chat")
	}
	msg := models.Messages{
		ChatID:      chat.ID,
		Messager:    "client",
		MessageBy:   chat.Client.Name,
		MessageType: "public message",
		ClientID:    &chat.ClientID,
		Message:     incoming.Message,
		CurrentPage: &incoming.CurrentPage,
	}
	if err := config.DB.Create(&msg).Error; err != nil {
		return fmt.Errorf("failed to create client message")
	}
	newResponse := struct {
		models.Messages
		Client models.ChatBotClient `json:"client"`
	}{Messages: msg, Client: chat.Client}
	SendToList(map[string]interface{}{
		"type":    "chat-list-update",
		"chat_id": chat.ID,
		"title":   "New message from " + chat.Client.Name,
	})
	SendToType(chat.ID, "staff", map[string]interface{}{"type": "message", "data": newResponse})
	conn.WriteJSON(map[string]interface{}{"type": "response", "data": newResponse})
	return nil
}

func ListChatMessagesforClient(c echo.Context) error {
	var chat models.ChatBotChats
	chatId := c.Param("chat_id")
	page, _ := strconv.Atoi(c.QueryParam("page"))
	limit, _ := strconv.Atoi(c.QueryParam("limit"))
	if page <= 0 {
		page = 1
	}
	if limit <= 0 {
		limit = 20
	}
	offset := (page - 1) * limit
	if err := config.DB.
		Preload("Client").
		Preload("Website").
		Preload("Messages", func(db *gorm.DB) *gorm.DB {
			return db.
				Where("message_type = ? OR message_type = ?", "public message", "public log").
				Order("id desc").
				Limit(limit).
				Offset(offset)
		}).
		Preload("Messages.Client").
		Preload("Messages.Staff", func(db *gorm.DB) *gorm.DB {
			return db.Select("id", "profile_pic", "name")
		}).
		Preload("Messages.MessagedAsStaff", func(db *gorm.DB) *gorm.DB {
			return db.Select("id", "profile_pic", "name")
		}).
		Where("id = ?", chatId).
		First(&chat).Error; err != nil {
		return c.JSON(http.StatusBadRequest, map[string]interface{}{
			"success": false,
			"error":   "Failed to fetch chat",
		})
	}
	for i := range chat.Messages {
		if chat.Messages[i].MessageType == "public log" {
			switch chat.Messages[i].Messager {
			case "employee":
				idx := strings.Index(chat.Messages[i].Message, " by ")
				if idx == -1 {
					idx = strings.Index(chat.Messages[i].Message, "\nby ")
				}
				if idx != -1 {
					chat.Messages[i].Message = chat.Messages[i].Message[:idx]
				}
			case "client":
				if idx := strings.Index(chat.Messages[i].Message, " by "); idx != -1 {
					chat.Messages[i].Message = chat.Messages[i].Message[:idx+4] + "You"
				}
			}
		}
	}
	return c.JSON(http.StatusOK, map[string]interface{}{
		"success": true,
		"data":    chat,
		"page":    page,
		"limit":   limit,
	})
}

func ChatBotFileFromClient(c echo.Context) error {
	var chat models.ChatBotChats
	chatIDParam := c.Param("chat_id")
	data := c.FormValue("data")
	var payload struct {
		Message     string `json:"message"`
		CurrentPage string `json:"current_page"`
	}
	chatID, _ := strconv.ParseUint(chatIDParam, 10, 64)
	if err := config.DB.Preload("Client").Where("id = ?", chatIDParam).First(&chat).Error; err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return fmt.Errorf("failed to get chat")
	}
	if err := json.Unmarshal([]byte(data), &payload); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]interface{}{
			"success": false,
			"error":   "Invalid data",
		})
	}
	fileURL, err := ChatBotFileUpload(c, uint(chat.ClientID), uint(chatID))
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
	}
	msg := models.Messages{
		ChatID:      chat.ID,
		Messager:    "client",
		MessageBy:   chat.Client.Name,
		MessageType: "public message",
		ClientID:    &chat.ClientID,
		Message:     payload.Message,
		FilePath:    fileURL,
		CurrentPage: &payload.CurrentPage,
	}
	if err := config.DB.Create(&msg).Error; err != nil {
		return c.JSON(http.StatusBadRequest, map[string]interface{}{
			"success": false,
			"error":   "Failed to create message",
		})
	}
	newResponse := struct {
		models.Messages
		Client models.ChatBotClient `json:"client"`
	}{Messages: msg, Client: chat.Client}
	SendToType(chat.ID, "staff", map[string]interface{}{"type": "message", "data": newResponse})
	SendToType(chat.ID, "client", map[string]interface{}{"type": "message", "data": newResponse})
	return c.JSON(http.StatusOK, map[string]interface{}{
		"success": true,
		"data":    newResponse,
	})
}

func ChatBotFileUpload(c echo.Context, clientID, chatID uint) (string, error) {
	var client models.ChatBotClient
	file, err := c.FormFile("file")
	if err != nil || file == nil {
		return "", nil
	}
	if err := config.DB.First(&client, clientID).Error; err != nil {
		return "", fmt.Errorf("client not found")
	}
	safeName := config.SanitizeFileName(client.Name)
	name := config.SanitizeFileName(file.Filename)
	fileName := fmt.Sprintf("%d_%s", chatID, name)
	filePath := fmt.Sprintf("chat-widget/messag_files/%s/%d/%s", safeName, chatID, fileName)
	fileURL, err := config.UploadFile(file, filePath)
	if err != nil {
		return "", fmt.Errorf("file upload failed: %s", err)
	}
	return fileURL, nil
}
