package beatify

import (
	"Beatify/models"
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
