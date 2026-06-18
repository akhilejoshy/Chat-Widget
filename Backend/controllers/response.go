package controllers

import (
	"chat-widget/config"
	"chat-widget/models"
	"net/http"

	"github.com/labstack/echo/v4"
)

func CreateAutoResponse(c echo.Context) error {
	var message models.AutoResponse
	if err := c.Bind(&message); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]interface{}{
			"success": false,
			"error":   "Invalid input data",
		})
	}
	if message.Message == "" {
		return c.JSON(http.StatusBadRequest, map[string]interface{}{
			"success": false,
			"error":   "Message field is required",
		})
	}
	if err := config.DB.Create(&message).Error; err != nil {
		return c.JSON(http.StatusBadRequest, map[string]interface{}{
			"success": false,
			"error":   "Failed to create auto response",
		})
	}
	return c.JSON(http.StatusOK, map[string]interface{}{
		"success": true,
		"data":    message,
	})
}

func ListAutoResponses(c echo.Context) error {
	search := c.QueryParam("search")
	var responses []models.AutoResponse
	query := config.DB.Model(&models.AutoResponse{})
	if search != "" {
		query = query.Where("message ILIKE ?", "%"+search+"%")
	}
	if err := query.Find(&responses).Error; err != nil {
		return c.JSON(http.StatusBadRequest, map[string]interface{}{
			"success": false,
			"error":   "Failed to fetch auto responses",
		})
	}
	return c.JSON(http.StatusOK, map[string]interface{}{
		"success": true,
		"data":    responses,
	})
}

func UpdateAutoResponse(c echo.Context) error {
	var message models.AutoResponse
	var existing models.AutoResponse
	id := c.Param("id")
	if err := c.Bind(&message); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]interface{}{
			"success": false,
			"error":   "Invalid input data",
		})
	}
	if message.Message == "" {
		return c.JSON(http.StatusBadRequest, map[string]interface{}{
			"success": false,
			"error":   "Message field is required",
		})
	}
	if err := config.DB.Where("id = ?", id).First(&existing).Error; err != nil {
		return c.JSON(http.StatusBadRequest, map[string]interface{}{
			"success": false,
			"error":   "Failed to find auto response",
		})
	}
	existing.Message = message.Message
	if err := config.DB.Save(&existing).Error; err != nil {
		return c.JSON(http.StatusBadRequest, map[string]interface{}{
			"success": false,
			"error":   "Failed to update auto response",
		})
	}
	return c.JSON(http.StatusOK, map[string]interface{}{
		"success": true,
		"data":    existing,
	})
}

func DeleteAutoResponse(c echo.Context) error {
	var message models.AutoResponse
	id := c.Param("id")
	if err := config.DB.Where("id = ?", id).First(&message).Error; err != nil {
		return c.JSON(http.StatusBadRequest, map[string]interface{}{
			"success": false,
			"error":   "Failed to find auto response",
		})
	}
	if err := config.DB.Delete(&message).Error; err != nil {
		return c.JSON(http.StatusBadRequest, map[string]interface{}{
			"success": false,
			"error":   "Failed to delete auto response",
		})
	}
	return c.JSON(http.StatusOK, map[string]interface{}{
		"success": true,
		"message": "Auto response deleted successfully",
	})
}
