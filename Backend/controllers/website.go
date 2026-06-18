package controllers

import (
	"chat-widget/config"
	"chat-widget/models"
	"encoding/json"
	"fmt"
	"net/http"
	"path/filepath"
	"strings"

	"github.com/labstack/echo/v4"
)

func CreateWebsiteScript(c echo.Context) error {
	var websiteScript models.WebsiteScript
	formdata := c.FormValue("data")
	if err := json.Unmarshal([]byte(formdata), &websiteScript); err != nil {
		return c.JSON(http.StatusNotAcceptable, map[string]interface{}{
			"success": false,
			"error":   "Invalid input data",
		})
	}
	if websiteScript.Name == "" {
		return c.JSON(http.StatusBadRequest, echo.Map{"success": false, "error": "Website name is required"})
	}
	if websiteScript.WebsiteID == "" {
		return c.JSON(http.StatusBadRequest, echo.Map{"success": false, "error": "Website id is required"})
	}
	if websiteScript.Script == "" {
		return c.JSON(http.StatusBadRequest, echo.Map{"success": false, "error": "Website script is required"})
	}
	iconURL, err := WebsiteIconUpload(c, websiteScript)
	if err != nil {
		return c.JSON(http.StatusBadRequest, echo.Map{"success": false, "error": "Failed to upload website icon"})
	}
	websiteScript.Icon = iconURL
	if err := config.DB.Create(&websiteScript).Error; err != nil {
		return c.JSON(http.StatusBadRequest, echo.Map{"success": false, "error": "Failed to create website script"})
	}
	return c.JSON(http.StatusOK, echo.Map{"success": true, "data": websiteScript})
}

func GetWebsiteScript(c echo.Context) error {
	var websiteScript models.WebsiteScript
	if err := config.DB.Where("website_id = ?", c.Param("website_id")).First(&websiteScript).Error; err != nil {
		return c.JSON(http.StatusOK, echo.Map{"success": true, "is_active": false})
	}
	return c.JSON(http.StatusOK, echo.Map{"success": true, "is_active": true})
}

func ListWebsiteScripts(c echo.Context) error {
	var websiteScripts []models.WebsiteScript
	if err := config.DB.Find(&websiteScripts).Error; err != nil {
		return c.JSON(http.StatusBadRequest, echo.Map{"success": false, "error": "Failed to list website scripts"})
	}
	return c.JSON(http.StatusOK, echo.Map{"success": true, "data": websiteScripts})
}

func DeleteWebsiteScript(c echo.Context) error {
	var websiteScript models.WebsiteScript
	id := c.Param("id")
	if err := config.DB.Where("id = ?", id).First(&websiteScript).Error; err != nil {
		return c.JSON(http.StatusBadRequest, echo.Map{"success": false, "error": "Failed to find website script"})
	}
	if err := config.DB.Delete(&websiteScript).Error; err != nil {
		return c.JSON(http.StatusBadRequest, echo.Map{"success": false, "error": "Failed to delete website script"})
	}
	return c.JSON(http.StatusOK, echo.Map{"success": true, "message": "Website script deleted successfully"})
}

func WebsiteIconUpload(c echo.Context, website models.WebsiteScript) (string, error) {
	file, err := c.FormFile("icon")
	if err != nil || file == nil {
		return "", nil
	}
	safeName := config.SanitizeFileName(website.Name)
	ext := filepath.Ext(file.Filename)
	baseName := strings.TrimSuffix(file.Filename, ext)
	safeBase := config.SanitizeFileName(baseName)
	fileName := fmt.Sprintf("%s_%s%s", safeBase, website.WebsiteID, ext)
	filePath := fmt.Sprintf("chat-widget/website_icon/%s/%s", safeName, fileName)
	fileURL, err := config.UploadFile(file, filePath)
	if err != nil {
		return "", fmt.Errorf("file upload failed: %s", err)
	}
	return fileURL, nil
}
