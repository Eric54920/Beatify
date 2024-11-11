package beatify

import (
	"Beatify/models"
	"bytes"
	"encoding/xml"
	"fmt"
	"io"
	"net/http"
	"path"
	"strings"

	"github.com/dhowden/tag"
)

// WebDAVClient 结构体包含连接信息
type WebDAVClient struct {
	Client   *http.Client
	BaseURL  string
	Username string
	Password string
}

// WebDAV 客户端配置
func NewWebDAVClient(baseURL, Username, Password string) (*WebDAVClient, error) {
	return &WebDAVClient{
		Client:   http.DefaultClient,
		BaseURL:  baseURL,
		Username: Username,
		Password: Password,
	}, nil
}

// 定义用于解析 XML 的结构体
type Multistatus struct {
	Responses []File `xml:"response"`
}

type File struct {
	Href  string `xml:"href"` // 文件或目录的路径
	Props Prop   `xml:"propstat>prop"`
}

type Prop struct {
	DisplayName     string `xml:"displayname"`        // 文件或目录名称
	ContentType     string `xml:"getcontenttype"`     // MIME 类型
	Size            int64  `xml:"getcontentlength"`   // 文件大小
	LastModified    string `xml:"getlastmodified"`    // 上次修改时间
	CreationDate    string `xml:"creationdate"`       // 创建时间
	ContentLanguage string `xml:"getcontentlanguage"` // 内容语言
	Etag            string `xml:"getetag"`            // ETag 标记
}

// 发送 PROPFIND 请求并解析 XML 响应
func fetchWebDAVFiles(w WebDAVClient, filePath string) ([]File, error) {
	// 创建 PROPFIND 请求体，depth=1 表示当前目录
	body := bytes.NewBufferString(`<?xml version="1.0" encoding="utf-8" ?><d:propfind xmlns:d="DAV:"><d:allprop/></d:propfind>`)

	fullFilePath, err := JoinUrl(w.BaseURL, filePath)
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequest("PROPFIND", fullFilePath, body)
	if err != nil {
		return nil, err
	}

	// 设置认证
	req.SetBasicAuth(w.Username, w.Password)
	// 设置 WebDAV 特有的头部信息
	req.Header.Set("Depth", "1")
	req.Header.Set("Content-Type", "application/xml")

	// 执行请求
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	// 读取并解析响应
	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var multistatus Multistatus
	if err := xml.Unmarshal(data, &multistatus); err != nil {
		return nil, err
	}

	return multistatus.Responses, nil
}

// 获取元信息
func (w WebDAVClient) fetchMetaData(filePath string) error {

	resp, err := w.GetFileStream(filePath, 0, 1_000_000, true)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return err
	}

	reader := bytes.NewReader(data)
	metaData, err := tag.ReadFrom(reader)
	if err != nil {
		return err
	}

	var dbSong models.Song

	if err := models.DB.First(&dbSong, "path = ?", filePath).Error; err != nil {
		return err
	}

	if metaData.Title() != "" {
		dbSong.Title = metaData.Title()
	}
	if metaData.Artist() != "" {
		dbSong.Artist = metaData.Artist()
	}
	if metaData.Album() != "" {
		dbSong.Album = metaData.Album()
	}
	if metaData.Genre() != "" {
		dbSong.Genre = metaData.Genre()
	}
	if metaData.Year() > 0 {
		year := new(int)
		*year = metaData.Year()
		dbSong.Year = year
	}

	if err := models.DB.Save(&dbSong).Error; err != nil {
		return err
	}

	return nil
}

// 获取文件夹数据
func (w WebDAVClient) GetFileList(dirId int) ([]FileInfo, error) {
	var dir models.Dir

	// 查询目录信息
	err := models.DB.First(&dir, "id = ?", dirId).Error
	if err != nil {
		return []FileInfo{}, err
	}

	// 获取目录文件列表
	files, err := fetchWebDAVFiles(w, dir.Url)
	if err != nil {
		return []FileInfo{}, err
	}

	var fileList = []FileInfo{}

	for _, f := range files {
		if f.Props.ContentType == "" {
			continue
		}

		var fileType string // 文件类型
		var title string    // 文件名
		var artist string   // 歌手

		// 分割文件名，去掉扩展名
		info := strings.Split(f.Props.DisplayName, ".")
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

		fileItem := FileInfo{
			Name:   title,
			Artist: artist,
			Isdir:  false,
			Path:   path.Join(dir.Url, f.Props.DisplayName),
			Size:   f.Props.Size,
			Type:   strings.ToUpper(fileType), // 文件类型
			UTime:  f.Props.LastModified,
		}

		fileList = append(fileList, fileItem)
	}
	return fileList, nil
}

// 请求从 WebDAV 服务器获取指定的内容
func (w WebDAVClient) GetFileStream(filePath string, start, end int64, isRange bool) (*http.Response, error) {
	url, _ := JoinUrl(w.BaseURL, filePath)

	// 创建 GET 请求，包含 Range 头
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}

	// 设置 Range 头和认证信息
	if isRange {
		req.Header.Set("Range", fmt.Sprintf("bytes=%d-%d", start, end))
	}
	req.SetBasicAuth(w.Username, w.Password)

	// 执行请求
	resp, err := w.Client.Do(req)
	if err != nil {
		return nil, err
	}

	// 校验响应状态码
	if (isRange && resp.StatusCode != http.StatusPartialContent) || (!isRange && resp.StatusCode != http.StatusOK) {
		resp.Body.Close() // 立即关闭不符合预期的响应体
		return nil, fmt.Errorf("unexpected status code: %d", resp.StatusCode)
	}

	// 返回 resp，调用方负责关闭
	return resp, nil
}
