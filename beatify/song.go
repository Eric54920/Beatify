package beatify

import (
	"Beatify/models"
	"bytes"
	"fmt"
	"io"
	"log"
	"math/rand"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/dhowden/tag"
)

// CreateSong 创建一个Song记录
func CreateSong(file FileInfo, dirId int) error {
	song := models.Song{
		Title:  file.Name,
		Artist: file.Artist,
		Path:   file.Path, // 文件路径
		Dir:    dirId,
		Size:   file.Size, // 文件大小，单位 MB
		Type:   file.Type, // 文件类型
	}

	err := models.DB.Create(&song).Error
	return err
}

// 根据目录ID获取歌曲列表
func (a *App) GetSongs(dirId int, sort string) Response {
	var songs []models.Song
	var err error

	if dirId == 0 {
		err = models.DB.Order(sort).Find(&songs).Error
	} else {
		err = models.DB.Order(sort).Find(&songs, "dir = ?", dirId).Error
	}

	if err != nil {
		return NewResponse(50000, nil)
	}

	return NewResponse(20000, songs)
}

// findNext 找到下一个
func findNext(slice []int, target int) (int, bool) {
	for i, v := range slice {
		if v == target && i+1 < len(slice) {
			return slice[i+1], true // 找到目标值的下一个值
		}
	}
	return 0, false // 如果没找到，返回false
}

// findPrev 找到上一个
func findPrev(slice []int, target int) (int, bool) {
	for i, v := range slice {
		if v == target && i-1 >= 0 {
			return slice[i-1], true // 找到目标值的上一个值
		}
	}
	return 0, false // 如果没找到，返回 false
}

// randomElement 从切片中随机返回一个元素
func randomElement(slice []int) int {
	// 创建一个新的随机数生成器，使用当前时间纳秒作为种子
	rng := rand.New(rand.NewSource(time.Now().UnixNano()))
	randomIndex := rng.Intn(len(slice)) // 生成0到len(slice)-1的随机索引
	return slice[randomIndex]
}

// 返回下一首要播放的歌曲
func (a *App) PlayNext(sort string, id, mode, dirId int) Response {
	var ids []int
	var err error

	// 根据 dirId 来查询 ids
	if dirId == 0 {
		err = models.DB.Model(&models.Song{}).Order(sort).Pluck("id", &ids).Error
	} else {
		err = models.DB.Model(&models.Song{}).Where("dir = ?", dirId).Order(sort).Pluck("id", &ids).Error
	}

	if err != nil {
		return NewResponse(50000, nil)
	}

	// 检查是否获取到 ids
	if len(ids) == 0 {
		return NewResponse(50000, nil)
	}

	var nextId int

	// 根据播放模式设置 nextId
	switch mode {
	case 1: // 列表循环
		if nID, ok := findNext(ids, id); ok {
			nextId = nID
		} else {
			nextId = ids[0] // 找不到下一个则取第一个
		}
	case 2: // 单曲循环
		nextId = id
	case 3: // 随机播放
		nextId = randomElement(ids)
	default:
		return NewResponse(40000, nil)
	}

	// 查询下一首歌曲的信息
	var song models.Song
	if err := models.DB.First(&song, "id = ?", nextId).Error; err != nil {
		return NewResponse(50000, nil)
	}

	return NewResponse(20000, song)
}

// 上一首
func (a *App) PlayPrev(sort string, id, mode, dirId int) Response {
	var ids []int
	var err error

	// 根据 dirId 来查询 ids
	if dirId == 0 {
		err = models.DB.Model(&models.Song{}).Order(sort).Pluck("id", &ids).Error
	} else {
		err = models.DB.Model(&models.Song{}).Where("dir = ?", dirId).Order(sort).Pluck("id", &ids).Error
	}

	if err != nil {
		return NewResponse(50000, nil)
	}

	// 检查是否获取到 ids
	if len(ids) == 0 {
		return NewResponse(50000, nil)
	}

	var prevId int

	// 根据播放模式设置 prevId
	switch mode {
	case 1: // 列表循环
		if nID, ok := findPrev(ids, id); ok {
			prevId = nID
		} else {
			prevId = ids[len(ids)-1] // 找不到上一个则取最后一个
		}
	case 2: // 单曲循环
		prevId = id
	case 3: // 随机播放
		prevId = randomElement(ids)
	default:
		return NewResponse(40000, nil)
	}

	// 查询上一首歌曲的信息
	var song models.Song
	if err := models.DB.First(&song, "id = ?", prevId).Error; err != nil {
		return NewResponse(50000, nil)
	}

	return NewResponse(20000, song)
}

// 启动音频流端点
func (a *App) StartServer() {
	// 音乐流媒体
	http.HandleFunc("/stream", a.streamMusicHandler)
	// 专辑封面
	http.HandleFunc("/cover", a.getCover)

	log.Fatal(http.ListenAndServe(":34116", nil))
}

func (a *App) streamMusicHandler(w http.ResponseWriter, r *http.Request) {

	// 设置跨域头部
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Range")

	q := r.URL.Query()
	id := q.Get("id")

	var song models.Song
	if err := models.DB.First(&song, "id = ?", id).Error; err != nil {
		http.Error(w, "歌曲不存在", http.StatusNotFound)
		return
	}

	fileSize := song.Size // 文件大小
	url := song.Path      // 文件url

	// 处理 Range 请求
	rangeHeader := r.Header.Get("Range")
	if rangeHeader != "" {
		// Range 请求头格式 "bytes=start-end"
		parts := strings.Split(rangeHeader, "=")
		if len(parts) != 2 || parts[0] != "bytes" {
			http.Error(w, "无效的 Range 请求", http.StatusRequestedRangeNotSatisfiable)
			return
		}

		// 解析开始和结束字节
		rangeParts := strings.Split(parts[1], "-")
		start, err := strconv.ParseInt(rangeParts[0], 10, 64)
		if err != nil {
			http.Error(w, "无效的 Range 起始字节", http.StatusRequestedRangeNotSatisfiable)
			return
		}

		// 如果未提供结束字节，则默认为文件结尾
		var end int64 = fileSize - 1
		if len(rangeParts) == 2 && rangeParts[1] != "" {
			end, err = strconv.ParseInt(rangeParts[1], 10, 64)
			if err != nil {
				http.Error(w, "无效的 Range 结束字节", http.StatusRequestedRangeNotSatisfiable)
				return
			}
		}

		// 校验范围合法性
		if start > end || end >= fileSize {
			http.Error(w, "Range 范围无效", http.StatusRequestedRangeNotSatisfiable)
			return
		}

		// 设置响应头
		w.Header().Set("Content-Type", "audio/flac")
		w.Header().Set("Content-Range", fmt.Sprintf("bytes %d-%d/%d", start, end, fileSize))
		w.Header().Set("Accept-Ranges", "bytes")
		w.WriteHeader(http.StatusPartialContent)

		// 创建 Range 请求从 WebDAV 服务器获取指定的内容
		rangeResp, err := a.client.GetFileStream(url, start, end, true)
		if err != nil {
			return
		}

		defer rangeResp.Body.Close()

		// 将 Range 内容写入响应
		w.Header().Set("Content-Length", strconv.FormatInt(end-start+1, 10))
		_, err = io.Copy(w, rangeResp.Body)
		if err != nil {
			http.Error(w, "读取文件出错", http.StatusInternalServerError)
			return
		}
	} else {
		// 如果不是部分请求，则返回整个文件
		fullResp, err := a.client.GetFileStream(url, 0, fileSize, false)
		if err != nil {
			return
		}

		defer fullResp.Body.Close()

		// 设置响应头
		w.Header().Set("Content-Type", "audio/flac")
		w.Header().Set("Content-Length", strconv.FormatInt(fileSize, 10))
		w.WriteHeader(http.StatusOK)
		_, err = io.Copy(w, fullResp.Body)
		if err != nil {
			http.Error(w, "读取文件出错", http.StatusInternalServerError)
			return
		}
	}
}

// serveDefaultCover 返回默认图片
func serveDefaultCover(w http.ResponseWriter) {
	defaultImagePath := "./frontend/src/assets/images/default_pic.png"
	data, err := os.ReadFile(defaultImagePath)
	if err != nil {
		http.Error(w, "无法加载默认图片", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "image/png")
	w.WriteHeader(http.StatusOK)
	w.Write(data)
}

// 根据 ID 返回图片
func (a *App) getCover(w http.ResponseWriter, r *http.Request) {
	// 设置跨域头部
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Range")

	// 从 URL 查询参数中获取 id
	id := r.URL.Query().Get("id")
	if id == "" {
		http.Error(w, "无效参数", http.StatusBadRequest)
		return
	}

	if id == "0" {
		serveDefaultCover(w)
		return
	}

	// 获取歌曲信息
	var song models.Song
	if err := models.DB.First(&song, "id = ?", id).Error; err != nil {
		http.Error(w, "歌曲不存在", http.StatusNotFound)
		return
	}

	// 获取数据流
	resp, err := a.client.GetFileStream(song.Path, 0, 2_000_000, true)
	if err != nil {
		return
	}

	defer resp.Body.Close()

	data, err := io.ReadAll(resp.Body)
	if err != nil {
		fmt.Println("读取响应体异常", err)
		return
	}

	// 读取元数据
	reader := bytes.NewReader(data)
	metaData, err := tag.ReadFrom(reader)
	if err != nil || metaData.Picture() == nil {
		serveDefaultCover(w)
		return
	}

	// 获取封面图像数据
	fdata := metaData.Picture().Data

	// 设置正确的 Content-Type
	contentType := metaData.Picture().MIMEType // 从元数据中获取 MIME 类型
	if contentType == "" {
		contentType = "image/jpeg" // 默认值
	}

	// 写入响应头和图像数据
	w.Header().Set("Content-Type", contentType)
	w.WriteHeader(http.StatusOK)
	w.Write(fdata)
}
