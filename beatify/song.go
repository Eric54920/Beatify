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
		return Response{
			Status: 500,
			Msg:    "查询数据库失败" + err.Error(),
			Data:   nil,
		}
	}

	return Response{
		Status: 200,
		Msg:    "获取成功",
		Data:   songs,
	}
}
