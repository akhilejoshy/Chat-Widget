package models

import "time"

type WebsiteScript struct {
	ID        uint   `json:"id"`
	Name      string `json:"name"`
	Icon      string `json:"icon"`
	WebsiteID string `json:"website_id"`
	Script    string `json:"script"`
}

type ChatBotClient struct {
	ID    uint           `json:"id"`
	Name  string         `json:"name"`
	Email string         `json:"email"`
	Chats []ChatBotChats `json:"chats" gorm:"foreignKey:ClientID"`
}

type ChatBotChats struct {
	ID           uint          `json:"id"`
	ChatID       string        `json:"chat_id" gorm:"->"`
	ClientID     uint          `json:"client_id"`
	ClientName   string        `json:"client_name"`
	Client       ChatBotClient `json:"client" gorm:"foreignKey:ClientID"`
	WebsiteID    string        `json:"website_id"`
	Department   string        `json:"department"`
	Website      WebsiteScript `json:"website" gorm:"foreignKey:WebsiteID;references:WebsiteID"`
	Status       string        `json:"status"`
	Description  string        `json:"description"`
	IpAddress    string        `json:"ip_address"`
	Country      string        `json:"country"`
	Browser      string        `json:"browser"`
	Device       string        `json:"device"`
	CreatedAt    time.Time     `json:"created_at"`
	MessageCount int           `json:"message_count" gorm:"-"`
	JointedBy    *uint         `json:"jointed_by"`
	Messages     []Messages    `json:"messages" gorm:"foreignKey:ChatID"`
}

type Messages struct {
	ID          uint      `json:"id"`
	Messager    string    `json:"messager"`
	MessageBy   string    `json:"message_by"`
	MessageType string    `json:"message_type"`
	UserID      *uint     `json:"user_id"`
	ClientID    *uint     `json:"client_id"`
	MessagedAs  *uint     `json:"messaged_as"`
	ChatID      uint      `json:"chat_id"`
	Message     string    `json:"message"`
	CurrentPage *string   `json:"current_page,omitempty"`
	CreatedAt   time.Time `json:"created_at"`
	FilePath    string    `json:"file_path"`
	IsRead      bool      `json:"is_read"`

	MessagedAsStaff *User          `json:"messaged_as_staff,omitempty" gorm:"foreignKey:MessagedAs"`
	Staff           *User          `json:"staff,omitempty" gorm:"foreignKey:UserID"`
	Client          *ChatBotClient `json:"client,omitempty" gorm:"foreignKey:ClientID"`
}

// StaffDetails is used as a scan target for staff queries; maps to User fields.
type StaffDetails struct {
	ID         uint   `json:"id"`
	ProfilePic string `json:"profile_pic"`
	FullName   string `json:"full_name"`
	Email      string `json:"email"`
}

type AutoResponse struct {
	ID      uint   `json:"id"`
	Message string `json:"message"`
}
