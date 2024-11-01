package beatify

import (
	"Beatify/models"
	"fmt"
	"io"
	"log"
	"net/http"
	"strconv"
	"strings"
)

// 根据目录ID获取歌曲列表
func (a *App) GetSongs(dirId int) Response {
	var songs []models.Song
	var err error

	if dirId == 0 {
		err = models.DB.Find(&songs).Error
	} else {
		err = models.DB.Find(&songs, "dir = ?", dirId).Error
	}

	if err != nil {
		return NewResponse(50000, nil)
	}

	return NewResponse(20000, songs)
}

// 启动音频流端点
func (a *App) StartServer() {
	// 音乐流媒体端点
	http.HandleFunc("/stream", a.streamMusicHandler)

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
