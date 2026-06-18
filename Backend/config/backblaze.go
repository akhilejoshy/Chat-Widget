package config

import (
	"bytes"
	"crypto/sha1"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"net/url"
	"os"
	"regexp"
	"strconv"
	"strings"
)

func backblazeURL() string  { return "https://api.backblazeb2.com/b2api/v2/b2_authorize_account" }
func backblazeKeyID() string { return os.Getenv("B2_KEY_ID") }
func backblazeKey() string   { return os.Getenv("B2_KEY") }
func backblazeBucketID() string { return os.Getenv("B2_BUCKET_ID") }
func backblazeBucketName() string { return os.Getenv("B2_BUCKET_NAME") }

func SanitizeFileName(name string) string {
	name = strings.ReplaceAll(name, " ", "_")
	name = strings.ReplaceAll(name, "\n", "_")
	name = strings.ReplaceAll(name, "\t", "_")
	name = strings.ReplaceAll(name, "\r", "_")
	reg := regexp.MustCompile(`[<>:"/\\|?*#&%$@!+=\[\]{}(),]`)
	name = reg.ReplaceAllString(name, "_")
	name = regexp.MustCompile(`_+`).ReplaceAllString(name, "_")
	name = strings.Trim(name, "._")
	return name
}

func computeSHA1(data []byte) string {
	h := sha1.New()
	h.Write(data)
	return fmt.Sprintf("%x", h.Sum(nil))
}

type AuthResponse struct {
	AuthorizationToken string `json:"authorizationToken"`
	APIURL             string `json:"apiUrl"`
	DownloadURL        string `json:"downloadUrl"`
}

type UploadURLResponse struct {
	UploadURL          string `json:"uploadUrl"`
	AuthorizationToken string `json:"authorizationToken"`
}

func UploadFile(file *multipart.FileHeader, path string) (string, error) {
	client := &http.Client{}

	// Step 1: Authorize
	req, err := http.NewRequest("GET", backblazeURL(), nil)
	if err != nil {
		return "", err
	}
	req.SetBasicAuth(backblazeKeyID(), backblazeKey())
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	var auth AuthResponse
	if err := json.NewDecoder(resp.Body).Decode(&auth); err != nil {
		return "", err
	}

	// Step 2: Get upload URL
	req, err = http.NewRequest("POST",
		fmt.Sprintf("%s/b2api/v2/b2_get_upload_url", auth.APIURL),
		bytes.NewBufferString(fmt.Sprintf(`{"bucketId":"%s"}`, backblazeBucketID())))
	if err != nil {
		return "", err
	}
	req.Header.Set("Authorization", auth.AuthorizationToken)
	req.Header.Set("Content-Type", "application/json")
	resp, err = client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	var upload UploadURLResponse
	if err := json.NewDecoder(resp.Body).Decode(&upload); err != nil {
		return "", err
	}

	// Step 3: Upload file
	fileData, err := file.Open()
	if err != nil {
		return "", err
	}
	defer fileData.Close()
	buf := bytes.NewBuffer(nil)
	if _, err = io.Copy(buf, fileData); err != nil {
		return "", err
	}
	if path != "" && path[0] == '/' {
		path = path[1:]
	}
	req, err = http.NewRequest("POST", upload.UploadURL, buf)
	if err != nil {
		return "", err
	}
	req.Header.Set("Authorization", upload.AuthorizationToken)
	req.Header.Set("X-Bz-File-Name", path)
	req.Header.Set("Content-Type", "application/octet-stream")
	req.Header.Set("X-Bz-Content-Sha1", computeSHA1(buf.Bytes()))
	req.Header.Set("Content-Length", strconv.Itoa(buf.Len()))
	resp, err = client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	if resp.StatusCode != 200 {
		b, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("upload failed: %s", string(b))
	}
	return fmt.Sprintf("%s/file/%s/%s", auth.DownloadURL, backblazeBucketName(), path), nil
}

func RemoveFile(fileURL string) error {
	client := &http.Client{}
	req, err := http.NewRequest("GET", backblazeURL(), nil)
	if err != nil {
		return err
	}
	req.SetBasicAuth(backblazeKeyID(), backblazeKey())
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	var auth AuthResponse
	if err := json.NewDecoder(resp.Body).Decode(&auth); err != nil {
		return err
	}
	filePath, err := extractFilePathFromURL(fileURL)
	if err != nil {
		return err
	}
	req, err = http.NewRequest("POST",
		fmt.Sprintf("%s/b2api/v2/b2_list_file_versions", auth.APIURL),
		bytes.NewBufferString(fmt.Sprintf(`{"bucketId":"%s","prefix":"%s","maxFileCount":1}`, backblazeBucketID(), filePath)))
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", auth.AuthorizationToken)
	req.Header.Set("Content-Type", "application/json")
	resp, err = client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	var versions struct {
		Files []struct {
			FileID   string `json:"fileId"`
			FileName string `json:"fileName"`
		} `json:"files"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&versions); err != nil {
		return err
	}
	if len(versions.Files) == 0 {
		return fmt.Errorf("file not found")
	}
	req, err = http.NewRequest("POST",
		fmt.Sprintf("%s/b2api/v2/b2_delete_file_version", auth.APIURL),
		bytes.NewBufferString(fmt.Sprintf(`{"fileName":"%s","fileId":"%s"}`, filePath, versions.Files[0].FileID)))
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", auth.AuthorizationToken)
	req.Header.Set("Content-Type", "application/json")
	resp, err = client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		b, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("delete failed: %s", string(b))
	}
	return nil
}

func extractFilePathFromURL(fileURL string) (string, error) {
	u, err := url.Parse(fileURL)
	if err != nil {
		return "", err
	}
	parts := strings.SplitN(u.Path, "/file/", 2)
	if len(parts) != 2 {
		return "", fmt.Errorf("invalid backblaze file url")
	}
	return strings.TrimPrefix(parts[1], backblazeBucketName()+"/"), nil
}
