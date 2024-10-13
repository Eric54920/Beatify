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
func (w WebDAVClient) GetFileList(dirId int) ([]FileInfo, error) {
	var dir models.Dir

	err := models.DB.First(&dir, "id = ?", dirId).Error
	if err != nil {
		fmt.Println(err.Error())
	}
	files, err := w.Client.ReadDir(dir.Url)

	if err != nil {
		return []FileInfo{}, err
	}

	var fileList = []FileInfo{}

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
		var title string    // 文件名
		var artist string   // 歌手

		// 分割文件名，去掉扩展名
		info := strings.Split(f.Name(), ".")
		if len(info) > 1 {
			fileType = info[len(info)-1]

			// 判断扩展名是否为音频文件后缀
			flag := false
			for _, audioExt := range audioExtensions {
				if fileType == audioExt {
					flag = true
					break
				}
			}

			if !flag {
				continue
			}
		}
		fullName := strings.Join(info[:len(info)-1], "")

		// 按照连字符拆分 "全名"
		nameList := strings.Split(fullName, "-")
		for i, item := range nameList {
			// 除去两边的空格
			nameList[i] = strings.TrimSpace(item)
		}

		// 获取歌曲名和歌手
		switch len(nameList) {
		case 1:
			title = nameList[0]
		case 2:
			artist = nameList[0]
			title = nameList[1]
		default:
			title = fullName
		}

		size, _ := strconv.ParseFloat(fmt.Sprintf("%.1f", float32(f.Size())/1024/1024), 64)

		fileItem := FileInfo{
			Name:   title,
			Artist: artist,
			Isdir:  false,
			Path:   f.Path(),
			Size:   size,
			Type:   strings.ToUpper(fileType), // 文件类型
			UTime:  f.ModTime().String(),
		}

		fileList = append(fileList, fileItem)
	}
	return fileList, nil
}
