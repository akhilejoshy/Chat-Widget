package controllers

import (
	"log"
	"net/http"
	"strconv"
	"sync"

	"github.com/gorilla/websocket"
	"github.com/labstack/echo/v4"
)

type ClientConnection struct {
	Conn   *websocket.Conn
	ChatID uint
	Type   string
	UserID uint
}

var clients = make(map[*websocket.Conn]ClientConnection)
var mutex sync.Mutex

func ChatListWebSocket(c echo.Context) error {
	userIDParam := c.Param("user_id")
	id, err := strconv.ParseUint(userIDParam, 10, 64)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]interface{}{
			"success": false,
			"error":   "Invalid user id",
		})
	}
	upgrader := websocket.Upgrader{CheckOrigin: func(r *http.Request) bool { return true }}
	conn, err := upgrader.Upgrade(c.Response(), c.Request(), nil)
	if err != nil {
		return err
	}
	mutex.Lock()
	clients[conn] = ClientConnection{Conn: conn, Type: "staff-list", UserID: uint(id)}
	mutex.Unlock()
	return nil
}

func ChatWebSocket(c echo.Context) error {
	chatIDParam := c.Param("chat_id")
	chatIDUint, err := strconv.ParseUint(chatIDParam, 10, 64)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]interface{}{
			"success": false,
			"error":   "Invalid chat id",
		})
	}
	userIDParam := c.Param("user_id")
	var connType string
	var userID uint
	if userIDParam != "" {
		connType = "staff"
		id, err := strconv.ParseUint(userIDParam, 10, 64)
		if err != nil {
			return c.JSON(http.StatusBadRequest, map[string]interface{}{
				"success": false,
				"error":   "Invalid user id",
			})
		}
		userID = uint(id)
	} else {
		connType = "client"
	}
	upgrader := websocket.Upgrader{CheckOrigin: func(r *http.Request) bool { return true }}
	conn, err := upgrader.Upgrade(c.Response(), c.Request(), nil)
	if err != nil {
		return err
	}
	mutex.Lock()
	clients[conn] = ClientConnection{
		Conn:   conn,
		ChatID: uint(chatIDUint),
		Type:   connType,
		UserID: userID,
	}
	mutex.Unlock()
	go handleMessages(conn)
	return nil
}

func handleMessages(conn *websocket.Conn) {
	defer func() {
		mutex.Lock()
		delete(clients, conn)
		mutex.Unlock()
		conn.Close()
	}()
	for {
		mutex.Lock()
		connection := clients[conn]
		mutex.Unlock()
		switch connection.Type {
		case "client":
			if err := handleClientMessage(conn, connection); err != nil {
				conn.WriteJSON(map[string]interface{}{"success": false, "error": err.Error()})
				log.Println("WebSocket error:", err)
				return
			}
		case "staff":
			if err := handleStaffMessage(conn, connection); err != nil {
				conn.WriteJSON(map[string]interface{}{"success": false, "error": err.Error()})
				log.Println("WebSocket error:", err)
				return
			}
		}
	}
}

func SendToList(payload interface{}) {
	mutex.Lock()
	conns := make([]*websocket.Conn, 0)
	for c, client := range clients {
		if client.Type == "staff-list" {
			conns = append(conns, c)
		}
	}
	mutex.Unlock()
	for _, c := range conns {
		if err := c.WriteJSON(payload); err != nil {
			mutex.Lock()
			c.Close()
			delete(clients, c)
			mutex.Unlock()
		}
	}
}

func SendToType(chatID uint, connType string, payload interface{}) bool {
	mutex.Lock()
	defer mutex.Unlock()
	delivered := false
	for c, client := range clients {
		if client.ChatID == chatID && client.Type == connType {
			if err := c.WriteJSON(payload); err != nil {
				c.Close()
				delete(clients, c)
				continue
			}
			delivered = true
		}
	}
	return delivered
}
