package beatify

import (
	"Beatify/models"
	"fmt"
	"strconv"
	"strings"

	"github.com/studio-b12/gowebdav"
)

// WebDAVClient 结构体包含连接信息
type WebDAVClient struct {
	Client   *gowebdav.Client
	BaseURL  string
	Username string
	Password string
}

// WebDAV 客户端配置
func NewWebDAVClient(baseURL, Username, Password string) (*WebDAVClient, error) {

	webdavClient := gowebdav.NewClient(baseURL, Username, Password)
	err := webdavClient.Connect()
	if err != nil {
		return &WebDAVClient{}, err
	}

	return &WebDAVClient{
		Client:   webdavClient,
		BaseURL:  baseURL,
		Username: Username,
		Password: Password,
	}, nil
}

// 获取文件夹数据
func (w WebDAVClient) GetFileList(dirId int) {
	var dir models.Dir

	err := models.DB.First(&dir, "id = ?", dirId).Error
	if err != nil {
		fmt.Println(err.Error())
	}
	files, _ := w.Client.ReadDir(dir.Url)

	for _, file := range files {
		f, ok := file.(gowebdav.File)
		if !ok {
			// 如果类型断言失败，跳过该文件
			continue
		}

		if f.ContentType() == "" {
			continue
		}

		var fileType string // 文件类型
		var name string     // 文件名
		var artist string   // 歌手

		// 分割文件名，去掉扩展名
		info := strings.Split(f.Name(), ".")
		if len(info) > 1 {
			fileType = info[len(info)-1]
		}
		fullName := strings.Join(info[:len(info)-1], "")

		// 按照连字符拆分 "全名"
		nameList := strings.Split(fullName, "-")
		for i, item := range nameList {
			nameList[i] = strings.TrimSpace(item)
		}

		// 检查 nameList 是否有足够的元素
		if len(nameList) > 0 {
			name = nameList[0]
		}
		if len(nameList) > 1 {
			artist = nameList[1]
		}

		size, _ := strconv.ParseFloat(fmt.Sprintf("%.1f", float32(f.Size())/1024/1024), 64)
		song := models.Song{
			Title:  name,
			Artist: artist,
			Path:   f.Path(),
			Dir:    dirId,
			Size:   size,                      // 文件大小，单位 MB
			Type:   strings.ToUpper(fileType), // 文件类型
		}

		_ = models.DB.Create(&song).Error
	}
}
