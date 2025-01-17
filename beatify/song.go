package beatify

import (
	"bytes"
	"encoding/json"
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
	"gorm.io/gorm"
)

// CreateSong 创建一个Song记录
func CreateSong(file FileInfo, dirId int) error {
	song := Song{
		Title:  file.Name,
		Artist: file.Artist,
		Path:   file.Path, // 文件路径
		Dir:    dirId,
		Size:   file.Size, // 文件大小，单位 MB
		Type:   file.Type, // 文件类型
	}

	err := DB.Create(&song).Error
	return err
}

// 获取歌曲信息
func (a *App) GetSong(id int) Response {
	var song Song

	if err := DB.First(&song, "id = ?", id).Error; err != nil {
		return NewResponse(50000, nil)
	}

	return NewResponse(20000, song)
}

// 更新歌曲信息
func (a *App) UpdateSong(id int, formData string) Response {
	var song Song
	var err error

	// 解析数据
	if err = json.Unmarshal([]byte(formData), &song); err != nil {
		return NewResponse(40000, nil)
	}

	// 找到原来的歌曲
	var dbSong Song
	err = DB.First(&dbSong, id).Error
	if err != nil && err == gorm.ErrRecordNotFound {
		return NewResponse(40004, nil)
	} else if err != nil {
		return NewResponse(50000, nil)
	}

	if dbSong.Title != song.Title {
		dbSong.Title = song.Title
	}

	if dbSong.Artist != song.Artist {
		dbSong.Artist = song.Artist
	}

	if dbSong.Album != song.Album {
		dbSong.Album = song.Album
	}

	if dbSong.Genre != song.Genre {
		dbSong.Genre = song.Genre
	}

	if dbSong.Year != song.Year {
		dbSong.Year = song.Year
	}

	if dbSong.Cover != song.Cover {
		dbSong.Cover = song.Cover
	}

	// 保存
	err = DB.Save(&dbSong).Error
	if err != nil {
		return NewResponse(50001, nil)
	}

	return NewResponse(20000, nil)
}

// 根据目录ID获取歌曲列表
func (a *App) GetSongs(dirId int, sort string) Response {
	var songs []Song
	var err error

	if dirId == 0 {
		err = DB.Order(sort).Find(&songs).Error
	} else {
		err = DB.Order(sort).Find(&songs, "dir = ?", dirId).Error
	}

	if err != nil {
		return NewResponse(50000, nil)
	}

	return NewResponse(20000, songs)
}

// 搜索歌曲
func (a *App) SearchSongs(sort, searchContent string) Response {
	var songs []Song

	content := fmt.Sprintf("%%%s%%", searchContent)
	err := DB.Order(sort).Where("title like ? or artist like ? or album like ?", content, content, content).Find(&songs).Error
	if err != nil {
		return NewResponse(50000, nil)
	}

	return NewResponse(20000, songs)
}

// 获取 待播列表 列表，最多展示20个，如果不足20个，择取前面的补充
func (a *App) GetPlayNextList(dirId, id int, sort string) Response {
	var songs []Song
	var newSongs []Song
	var err error

	// 当 dirId 为 0 时，直接查询所有记录并返回排序后的结果
	if dirId == 0 {
		err = DB.Order(sort).Find(&songs).Error
	} else {
		// 获取排序后的所有记录，并根据 dirId 筛选
		err = DB.Order(sort).Where("dir = ?", dirId).Find(&songs).Error
	}

	// 处理查询错误
	if err != nil {
		return NewResponse(50000, nil)
	}

	// 查找目标 id 的位置
	var startIndex int
	for i, song := range songs {
		if song.ID == id {
			startIndex = i + 1 // 从 id 后面开始
			break
		}
	}

	// 如果没有找到指定的 id，返回空
	if startIndex == 0 {
		return NewResponse(40004, nil)
	}

	// 最多获取20个
	if len(songs[startIndex:]) > 20 {
		newSongs = songs[startIndex : startIndex+20]
	} else {
		newSongs = songs[startIndex:]
	}

	if len(newSongs) == 0 {
		if len(songs) > 20 {
			newSongs = songs[:20]
		} else {
			newSongs = songs
		}
	}

	// 返回查询结果
	return NewResponse(20000, newSongs)
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
		err = DB.Model(&Song{}).Order(sort).Pluck("id", &ids).Error
	} else {
		err = DB.Model(&Song{}).Where("dir = ?", dirId).Order(sort).Pluck("id", &ids).Error
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
	var song Song
	if err := DB.First(&song, "id = ?", nextId).Error; err != nil {
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
		err = DB.Model(&Song{}).Order(sort).Pluck("id", &ids).Error
	} else {
		err = DB.Model(&Song{}).Where("dir = ?", dirId).Order(sort).Pluck("id", &ids).Error
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
	var song Song
	if err := DB.First(&song, "id = ?", prevId).Error; err != nil {
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

	var song Song
	if err := DB.First(&song, "id = ?", id).Error; err != nil {
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
	var song Song
	if err := DB.First(&song, "id = ?", id).Error; err != nil {
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
