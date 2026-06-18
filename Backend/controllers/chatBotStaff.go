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
	"time"

	"github.com/gorilla/websocket"
	"github.com/labstack/echo/v4"
	"gorm.io/gorm"
)

func handleStaffMessage(conn *websocket.Conn, connection ClientConnection) error {
	var chat models.ChatBotChats
	var staff models.StaffDetails
	var MessagedAs models.StaffDetails
	var messageBy string
	var messages models.Messages
	var incoming struct {
		Message     string  `json:"message"`
		MessageType string  `json:"message_type"`
		MessagedAs  *uint   `json:"messaged_as"`
		FakeName    *string `json:"fake_name"`
	}
	if err := conn.ReadJSON(&incoming); err != nil {
		return fmt.Errorf("failed to read staff message")
	}
	if strings.TrimSpace(incoming.Message) == "" {
		return fmt.Errorf("staff message cannot be empty")
	}
	if err := config.DB.Preload("Client").Where("id = ?", connection.ChatID).First(&chat).Error; err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return fmt.Errorf("failed to get staff chat")
	}
	if incoming.MessageType == "public message" {
		switch chat.Status {
		case "created":
			return fmt.Errorf("chat is not opened")
		case "closed":
			return fmt.Errorf("chat is closed")
		}
	}
	if err := config.DB.Model(&models.User{}).Select("id, name as full_name, profile_pic, email").Where("id = ?", connection.UserID).First(&staff).Error; err != nil {
		return fmt.Errorf("failed to get staff")
	}
	if incoming.FakeName != nil && *incoming.FakeName != "" {
		messageBy = fmt.Sprintf("%s(%s)", *incoming.FakeName, staff.FullName)
	} else if incoming.MessagedAs != nil {
		if err := config.DB.Model(&models.User{}).Select("id, name as full_name, profile_pic, email").Where("id = ?", *incoming.MessagedAs).First(&MessagedAs).Error; err != nil {
			return fmt.Errorf("failed to get messaged as staff")
		}
		messageBy = fmt.Sprintf("%s(%s)", MessagedAs.FullName, staff.FullName)
	} else {
		messageBy = fmt.Sprintf("%s(%s)", staff.FullName, staff.FullName)
	}
	msg := models.Messages{
		ChatID:      chat.ID,
		Messager:    "employee",
		MessageBy:   messageBy,
		MessageType: incoming.MessageType,
		UserID:      &connection.UserID,
		Message:     incoming.Message,
		MessagedAs:  incoming.MessagedAs,
	}
	if incoming.MessageType == "public message" {
		msg.IsRead = true
	}
	if err := config.DB.Create(&msg).Error; err != nil {
		return fmt.Errorf("failed to create message")
	}
	if err := config.DB.
		Preload("MessagedAsStaff", func(db *gorm.DB) *gorm.DB {
			return db.Select("id", "profile_pic", "name")
		}).
		Preload("Staff", func(db *gorm.DB) *gorm.DB {
			return db.Select("id", "profile_pic", "name")
		}).
		Preload("Client").Where("id = ?", msg.ID).First(&messages).Error; err != nil {
		return fmt.Errorf("failed to get message")
	}
	switch incoming.MessageType {
	case "public message":
		SendToType(chat.ID, "client", map[string]interface{}{
			"type":  "notification",
			"title": "New reply from support",
		})
		clientResponse := messages
		clientResponse.MessageBy = ""
		clientResponse.Staff = nil
		SendToType(chat.ID, "client", map[string]interface{}{"type": "message", "data": clientResponse})
	case "private message":
		SendToList(map[string]interface{}{
			"type":    "chat-list-update",
			"chat_id": chat.ID,
			"title":   "New message from " + chat.Client.Name,
		})
	default:
		return fmt.Errorf("invalid message type")
	}
	SendToType(chat.ID, "staff", map[string]interface{}{"type": "message", "data": messages})
	return nil
}

func ListChatsForStaff(c echo.Context) error {
	var totalPages int64 = 1
	var totalChats int64
	type ChatWithExtras struct {
		models.ChatBotChats
		Preview  *string `json:"preview"`
		Attended *string `json:"attended"`
	}
	var chats []ChatWithExtras
	search := c.QueryParam("search")
	websiteID := c.QueryParam("website_id")
	status := c.QueryParam("status")
	email := c.QueryParam("email")
	page, _ := strconv.Atoi(c.QueryParam("page"))
	limit, _ := strconv.Atoi(c.QueryParam("limit"))
	query := config.DB.Model(&models.ChatBotChats{}).
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
		Joins(`LEFT JOIN LATERAL (
			SELECT message, file_path FROM messages
			WHERE messages.chat_id = chat_bot_chats.id AND messager = 'client'
			ORDER BY id DESC LIMIT 1
		) client_msg ON true`).
		Joins(`LEFT JOIN LATERAL (
			SELECT user_id FROM messages
			WHERE messages.chat_id = chat_bot_chats.id AND messager = 'employee'
			ORDER BY id DESC LIMIT 1
		) staff_msg ON true`).
		Joins(`LEFT JOIN users u ON u.id = staff_msg.user_id`).
		Preload("Client").
		Preload("Website")
	if search != "" {
		pattern := "%" + search + "%"
		query = query.
			Joins("LEFT JOIN chat_bot_clients ON chat_bot_clients.id = chat_bot_chats.client_id").
			Joins("LEFT JOIN website_scripts ON website_scripts.website_id = chat_bot_chats.website_id").
			Where(`chat_bot_clients.name ILIKE ? OR chat_bot_chats.chat_id ILIKE ? OR chat_bot_chats.status ILIKE ? OR chat_bot_chats.country ILIKE ? OR u.name ILIKE ? OR website_scripts.name ILIKE ?`,
				pattern, pattern, pattern, pattern, pattern, pattern)
	}
	if websiteID != "" {
		query = query.Where("website_id = ?", websiteID)
	}
	if status != "" {
		query = query.Where("status = ?", status)
	}
	if email != "" {
		query = query.
			Joins("LEFT JOIN chat_bot_clients ON chat_bot_clients.id = chat_bot_chats.client_id").
			Where("chat_bot_clients.email = ?", email)
	}
	_ = query.Count(&totalChats)
	query = query.Order("chat_bot_chats.created_at DESC")
	if page > 0 && limit > 0 {
		offset := (page - 1) * limit
		query = query.Offset(offset).Limit(limit)
		totalPages = (totalChats + int64(limit) - 1) / int64(limit)
	} else {
		page = 1
		if totalChats == 0 {
			limit = 0
			totalPages = 0
		} else {
			limit = int(totalChats)
			totalPages = 1
		}
	}
	if err := query.Find(&chats).Error; err != nil {
		return c.JSON(http.StatusBadRequest, map[string]interface{}{
			"success": false,
			"error":   "Couldn't list the chats",
		})
	}
	if len(chats) > 0 {
		var chatIDs []uint
		for _, chat := range chats {
			chatIDs = append(chatIDs, chat.ID)
		}
		type UnreadCount struct {
			ChatID uint
			Count  int
		}
		var unreadCounts []UnreadCount
		config.DB.Model(&models.Messages{}).
			Select("chat_id, count(id) as count").
			Where("chat_id IN ? AND is_read = ?", chatIDs, false).
			Group("chat_id").
			Scan(&unreadCounts)
		countMap := make(map[uint]int)
		for _, uc := range unreadCounts {
			countMap[uc.ChatID] = uc.Count
		}
		for i := range chats {
			chats[i].MessageCount = countMap[chats[i].ID]
		}
	}
	return c.JSON(http.StatusOK, map[string]interface{}{
		"success": true,
		"response": map[string]interface{}{
			"page":        page,
			"limit":       limit,
			"total_pages": totalPages,
			"total_chats": totalChats,
			"chats":       chats,
		},
	})
}

func ListChatMessagesforStaff(c echo.Context) error {
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
			return db.Order("id desc").Offset(offset).Limit(limit)
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
	return c.JSON(http.StatusOK, map[string]interface{}{
		"success": true,
		"data":    chat,
	})
}

func UpdateChatsStatus(c echo.Context) error {
	var status string
	var msg models.Messages
	var chat models.ChatBotChats
	var messageForClient string
	userID := c.Param("user_id")
	chatID := c.Param("chat_id")
	if err := config.DB.Preload("Client").Where("id = ?", chatID).First(&chat).Error; err != nil {
		return c.JSON(http.StatusBadRequest, map[string]interface{}{
			"success": false,
			"error":   "Failed to get chat",
		})
	}
	msg.MessageType = "public log"
	msg.ChatID = chat.ID
	if userID != "" {
		status = c.QueryParam("status")
		var user models.User
		if status != "open" && status != "closed" {
			return c.JSON(http.StatusBadRequest, map[string]interface{}{
				"success": false,
				"error":   "Invalid status",
			})
		}
		if err := config.DB.Where("id = ?", userID).First(&user).Error; err != nil {
			return c.JSON(http.StatusBadRequest, map[string]interface{}{
				"success": false,
				"error":   "Failed to get staff",
			})
		}
		msg.UserID = &user.ID
		msg.Messager = "employee"
		msg.MessageBy = fmt.Sprintf("%s(%s)", user.Name, user.Name)
		msg.IsRead = true
		switch status {
		case "open":
			messageForClient = "Chat is opened"
		case "closed":
			msg.Message = "Chat is closed by " + user.Name
			messageForClient = "Chat is closed"
		}
	} else {
		if chat.Status == "closed" {
			return nil
		}
		status = "closed"
		msg.Message = "Chat is closed by client " + chat.Client.Name
		msg.Messager = "client"
		msg.MessageBy = chat.Client.Name
		msg.ClientID = &chat.ClientID
		msg.IsRead = true
		messageForClient = "Chat is closed by you"
	}
	if status == "closed" {
		if err := config.DB.Model(&models.Messages{}).Where("chat_id = ?", chat.ID).Update("is_read", true).Error; err != nil {
			return c.JSON(http.StatusBadRequest, map[string]interface{}{
				"success": false,
				"error":   "Failed to update messages read status",
			})
		}
	}
	if err := config.DB.Model(&models.ChatBotChats{}).Where("id = ?", chatID).Updates(map[string]interface{}{"status": status}).Error; err != nil {
		return c.JSON(http.StatusBadRequest, map[string]interface{}{
			"success": false,
			"error":   "Failed to update chat status",
		})
	}
	if status != "open" {
		if err := config.DB.Create(&msg).Error; err != nil {
			return c.JSON(http.StatusBadRequest, map[string]interface{}{
				"success": false,
				"error":   "Failed to update chat message",
			})
		}
		SendToType(chat.ID, "staff", map[string]interface{}{"type": "message", "data": msg})
	}
	clientResponse := msg
	clientResponse.MessageBy = ""
	clientResponse.Message = messageForClient
	SendToType(chat.ID, "client", map[string]interface{}{
		"type":   "message",
		"data":   clientResponse,
		"status": status,
	})
	return c.JSON(http.StatusOK, map[string]interface{}{
		"success": true,
		"data":    "Chat status updated successfully as " + status,
	})
}

func ChatBotFileFromStaff(c echo.Context) error {
	var chat models.ChatBotChats
	var staff models.StaffDetails
	var MessagedAs models.StaffDetails
	var messageBy string
	var incoming struct {
		Message     string  `json:"message"`
		MessageType string  `json:"message_type"`
		MessagedAs  *uint   `json:"messaged_as"`
		FakeName    *string `json:"fake_name"`
	}
	data := c.FormValue("data")
	userID := c.Param("user_id")
	chatID, _ := strconv.ParseUint(c.Param("chat_id"), 10, 64)
	if err := json.Unmarshal([]byte(data), &incoming); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]interface{}{
			"success": false,
			"error":   "Invalid data",
		})
	}
	if err := config.DB.Preload("Client").Where("id = ?", chatID).First(&chat).Error; err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return fmt.Errorf("failed to get chat")
	}
	if incoming.MessageType == "public message" {
		switch chat.Status {
		case "created":
			return c.JSON(http.StatusBadRequest, map[string]interface{}{"success": false, "error": "Chat is not opened"})
		case "closed":
			return c.JSON(http.StatusBadRequest, map[string]interface{}{"success": false, "error": "Chat is closed"})
		}
	}
	if err := config.DB.Model(&models.User{}).Select("id, name as full_name, profile_pic, email").Where("id = ?", userID).First(&staff).Error; err != nil {
		return c.JSON(http.StatusBadRequest, map[string]interface{}{"success": false, "error": "Failed to get staff"})
	}
	if incoming.FakeName != nil && *incoming.FakeName != "" {
		messageBy = fmt.Sprintf("%s(%s)", *incoming.FakeName, staff.FullName)
	} else if incoming.MessagedAs != nil {
		if err := config.DB.Model(&models.User{}).Select("id, name as full_name, profile_pic, email").Where("id = ?", *incoming.MessagedAs).First(&MessagedAs).Error; err != nil {
			return c.JSON(http.StatusBadRequest, map[string]interface{}{"success": false, "error": "Failed to get messaged as staff"})
		}
		messageBy = fmt.Sprintf("%s(%s)", MessagedAs.FullName, staff.FullName)
	} else {
		messageBy = fmt.Sprintf("%s(%s)", staff.FullName, staff.FullName)
	}
	fileURL, err := ChatBotFileUpload(c, uint(chat.ClientID), uint(chatID))
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]interface{}{"success": false, "error": err.Error()})
	}
	msg := models.Messages{
		ChatID:      chat.ID,
		Messager:    "employee",
		MessageBy:   messageBy,
		MessageType: incoming.MessageType,
		UserID:      &staff.ID,
		Message:     incoming.Message,
		FilePath:    fileURL,
		MessagedAs:  incoming.MessagedAs,
	}
	if err := config.DB.Create(&msg).Error; err != nil {
		return c.JSON(http.StatusBadRequest, map[string]interface{}{"success": false, "error": "Failed to create message"})
	}
	newResponse := struct {
		models.Messages
		Employee   models.StaffDetails `json:"staff"`
		MessagedAs models.StaffDetails `json:"messaged_as"`
	}{Messages: msg, Employee: staff, MessagedAs: MessagedAs}
	switch incoming.MessageType {
	case "public message":
		SendToType(chat.ID, "client", map[string]interface{}{"type": "notification", "title": "New reply from support"})
		SendToType(chat.ID, "client", map[string]interface{}{"type": "message", "data": newResponse})
	case "private message":
	default:
		return fmt.Errorf("invalid message type")
	}
	SendToType(chat.ID, "staff", map[string]interface{}{"type": "message", "data": newResponse})
	return c.JSON(http.StatusOK, map[string]interface{}{"success": true, "data": newResponse})
}

func UpdateStaffJoinLog(c echo.Context) error {
	var staff models.StaffDetails
	var MessagedAs models.StaffDetails
	var message string
	var jointedBy *uint
	chatIDParam := c.Param("chat_id")
	staffID := c.Param("user_id")
	status := c.QueryParam("status")
	messagedAsID := c.QueryParam("messaged_as")
	fakeName := c.QueryParam("fake_name")
	if err := config.DB.Model(&models.User{}).Select("id, name as full_name, profile_pic, email").Where("id = ?", staffID).First(&staff).Error; err != nil {
		return c.JSON(http.StatusBadRequest, map[string]interface{}{"success": false, "error": "Failed to get staff"})
	}
	chatID, _ := strconv.ParseUint(chatIDParam, 10, 64)
	if messagedAsID != "" {
		if err := config.DB.Model(&models.User{}).Select("id, name as full_name, profile_pic, email").Where("id = ?", messagedAsID).First(&MessagedAs).Error; err != nil {
			return fmt.Errorf("failed to get messaged as staff")
		}
	}
	switch status {
	case "join":
		if fakeName != "" {
			message = fmt.Sprintf("%s joined the chat as %s", staff.FullName, fakeName)
		} else if messagedAsID != "" && messagedAsID != staffID {
			message = fmt.Sprintf("%s joined the chat as %s", staff.FullName, MessagedAs.FullName)
		} else {
			message = fmt.Sprintf("%s joined the chat", staff.FullName)
		}
		jointedBy = &staff.ID
	case "leave":
		if fakeName != "" {
			message = fmt.Sprintf("%s left the chat as %s", staff.FullName, fakeName)
		} else if messagedAsID != "" && messagedAsID != staffID {
			message = fmt.Sprintf("%s left the chat as %s", staff.FullName, MessagedAs.FullName)
		} else {
			message = fmt.Sprintf("%s left the chat", staff.FullName)
		}
		jointedBy = nil
	default:
		return c.JSON(http.StatusBadRequest, map[string]interface{}{"success": false, "error": "Invalid status"})
	}
	msg := models.Messages{
		ChatID:      uint(chatID),
		Messager:    "employee",
		MessageBy:   staff.FullName,
		MessageType: "private log",
		UserID:      &staff.ID,
		Message:     message,
		IsRead:      true,
	}
	if messagedAsID != "" {
		msg.MessagedAs = &MessagedAs.ID
	}
	if err := config.DB.Create(&msg).Error; err != nil {
		return c.JSON(http.StatusBadRequest, map[string]interface{}{"success": false, "error": "Failed to create log"})
	}
	if err := config.DB.Model(&models.ChatBotChats{}).Where("id = ?", chatID).Update("jointed_by", jointedBy).Error; err != nil {
		return c.JSON(http.StatusBadRequest, map[string]interface{}{"success": false, "error": "Failed to update jointed by"})
	}
	SendToType(uint(chatID), "staff", map[string]interface{}{"type": "message", "data": msg})
	return c.JSON(http.StatusOK, map[string]interface{}{"success": true, "data": "Log created successfully"})
}

func UpdateMessageReadStatus(c echo.Context) error {
	var chat models.ChatBotChats
	type readStatus struct {
		MessageID uint `json:"message_id"`
		IsRead    bool `json:"is_read"`
	}
	var input []readStatus
	chatID := c.Param("chat_id")
	if err := config.DB.Model(&models.ChatBotChats{}).Where("id = ?", chatID).First(&chat).Error; err != nil {
		return c.JSON(http.StatusBadRequest, map[string]interface{}{"success": false, "error": "Failed to get chat"})
	}
	if err := c.Bind(&input); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]interface{}{"success": false, "error": "Invalid data"})
	}
	for _, rs := range input {
		if err := config.DB.Model(&models.Messages{}).Where("id = ? AND chat_id = ?", rs.MessageID, chat.ID).Update("is_read", rs.IsRead).Error; err != nil {
			return c.JSON(http.StatusBadRequest, map[string]interface{}{"success": false, "error": "Failed to update message read status"})
		}
	}
	return c.JSON(http.StatusOK, map[string]interface{}{"success": true, "data": "Message read status updated successfully"})
}

func ChatPeriod(period string, date time.Time) (time.Time, time.Time, error) {
	var start time.Time
	end := time.Date(date.Year(), date.Month(), date.Day(), 23, 59, 59, 0, date.Location())
	startOfDay := time.Date(date.Year(), date.Month(), date.Day(), 0, 0, 0, 0, date.Location())
	switch period {
	case "last_7_days":
		start = startOfDay.AddDate(0, 0, -6)
	case "last_30_days":
		start = startOfDay.AddDate(0, 0, -29)
	case "last_90_days":
		start = startOfDay.AddDate(0, 0, -89)
	default:
		return time.Time{}, time.Time{}, errors.New("invalid date period")
	}
	return start, end, nil
}

func PercentageCalculate(latest, previous int) string {
	if latest == previous {
		return "No change from previous period"
	}
	if previous == 0 {
		return fmt.Sprintf("Added %d from previous period", latest)
	}
	change := float64(latest-previous) / float64(previous) * 100
	if change > 0 {
		return fmt.Sprintf("+%.1f%% from previous period", change)
	}
	return fmt.Sprintf("%.1f%% from previous period", change)
}

func ChatOverviewByStaff(c echo.Context) error {
	var user models.User
	var latestPeriodChats []models.ChatBotChats
	var previousPeriodChats []models.ChatBotChats
	var latestAvgResponseTime, previousAvgResponseTime float64
	type OverviewModel struct {
		Title  string `json:"title"`
		Count  string `json:"count"`
		Growth string `json:"growth"`
	}
	type VolumeItem struct {
		Time  string `json:"time"`
		Count string `json:"count"`
	}
	var volumeLabels []string
	var overviews []OverviewModel
	var volumeData []VolumeItem
	var data []interface{}
	var previousTotalDuration float64
	var latestTotalDuration float64
	avgGrowthText := ""
	latestOpenChats := 0
	previousOpenChats := 0
	latestClosedChats := 0
	previousClosedChats := 0
	userIDStr := c.Param("user_id")
	period := c.QueryParam("date_period")
	hourSplitParam := c.QueryParam("hour_split")
	hoursPerSplit, err := strconv.Atoi(hourSplitParam)
	if err != nil || (hoursPerSplit != 4 && hoursPerSplit != 6 && hoursPerSplit != 8) {
		hoursPerSplit = 4
	}
	numSplits := 24 / hoursPerSplit
	userID, err := strconv.Atoi(userIDStr)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]interface{}{"success": false, "error": "Invalid user request."})
	}
	if err := config.DB.First(&user, userID).Error; err != nil {
		return c.JSON(http.StatusBadRequest, map[string]interface{}{"success": false, "error": "User not found."})
	}
	if period == "" {
		period = "last_7_days"
	}
	latestStart, _, err := ChatPeriod(period, time.Now())
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]interface{}{"success": false, "error": err.Error()})
	}
	if err := config.DB.Preload("Messages").Where("created_at BETWEEN ? AND ?", latestStart, time.Now()).Find(&latestPeriodChats).Error; err != nil {
		return c.JSON(http.StatusBadRequest, map[string]interface{}{"success": false, "error": "Could not fetch chats from current period."})
	}
	previousStart, previousEnd, err := ChatPeriod(period, latestStart.Add(-time.Second))
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]interface{}{"success": false, "error": err.Error()})
	}
	if err := config.DB.Preload("Messages").Where("created_at BETWEEN ? AND ?", previousStart, previousEnd).Find(&previousPeriodChats).Error; err != nil {
		return c.JSON(http.StatusBadRequest, map[string]interface{}{"success": false, "error": "Could not fetch chats from previous period."})
	}
	latestTotalCount := len(latestPeriodChats)
	previousTotalCount := len(previousPeriodChats)
	overviews = append(overviews, OverviewModel{Title: "Total chats", Count: strconv.Itoa(latestTotalCount), Growth: PercentageCalculate(latestTotalCount, previousTotalCount)})
	for _, chat := range latestPeriodChats {
		if chat.Status == "open" {
			latestOpenChats++
		}
	}
	for _, chat := range previousPeriodChats {
		if chat.Status == "open" {
			previousOpenChats++
		}
	}
	overviews = append(overviews, OverviewModel{Title: "Open chats", Count: strconv.Itoa(latestOpenChats), Growth: PercentageCalculate(latestOpenChats, previousOpenChats)})
	for _, chat := range latestPeriodChats {
		if chat.Status == "closed" {
			latestClosedChats++
		}
	}
	for _, chat := range previousPeriodChats {
		if chat.Status == "closed" {
			previousClosedChats++
		}
	}
	overviews = append(overviews, OverviewModel{Title: "Closed chats", Count: strconv.Itoa(latestClosedChats), Growth: PercentageCalculate(latestClosedChats, previousClosedChats)})
	for _, chat := range latestPeriodChats {
		for _, msg := range chat.Messages {
			if msg.Messager == "employee" {
				latestTotalDuration += msg.CreatedAt.Sub(chat.CreatedAt).Hours()
			}
		}
	}
	if latestTotalCount > 0 {
		latestAvgResponseTime = latestTotalDuration / float64(latestTotalCount)
	}
	for _, chat := range previousPeriodChats {
		for _, msg := range chat.Messages {
			if msg.Messager == "employee" {
				previousTotalDuration += msg.CreatedAt.Sub(chat.CreatedAt).Hours()
			}
		}
	}
	if previousTotalCount > 0 {
		previousAvgResponseTime = previousTotalDuration / float64(previousTotalCount)
	}
	if latestAvgResponseTime == previousAvgResponseTime {
		avgGrowthText = "No change from previous period"
	} else {
		diff := latestAvgResponseTime - previousAvgResponseTime
		if diff > 0 {
			avgGrowthText = fmt.Sprintf("+%.1f hrs from previous period", diff)
		} else {
			avgGrowthText = fmt.Sprintf("%.1f hrs from previous period", diff)
		}
	}
	overviews = append(overviews, OverviewModel{Title: "Avg Response Time", Count: fmt.Sprintf("%.1f hours", latestAvgResponseTime), Growth: avgGrowthText})
	for i := 0; i < numSplits; i++ {
		start := i * hoursPerSplit
		end := (i + 1) * hoursPerSplit
		if end == 24 {
			volumeLabels = append(volumeLabels, fmt.Sprintf("%02d:00-00:00", start))
		} else {
			volumeLabels = append(volumeLabels, fmt.Sprintf("%02d:00-%02d:00", start, end))
		}
	}
	volumeCounts := make([]int, numSplits)
	for _, chat := range latestPeriodChats {
		hour := chat.CreatedAt.Hour()
		index := hour / hoursPerSplit
		if index >= 0 && index < numSplits {
			volumeCounts[index]++
		}
	}
	for i, label := range volumeLabels {
		volumeData = append(volumeData, VolumeItem{Time: label, Count: strconv.Itoa(volumeCounts[i])})
	}
	for _, ov := range overviews {
		data = append(data, ov)
	}
	data = append(data, map[string]interface{}{"volume": volumeData})
	return c.JSON(http.StatusOK, map[string]interface{}{
		"success": true,
		"response": map[string]interface{}{
			"data": data,
		},
	})
}
