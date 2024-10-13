package beatify

import (
	"Beatify/models"
	"encoding/json"

	"gorm.io/gorm"
)

// 获取所有目录
func (a *App) GetAllDirs() Response {
	var dirs []models.Dir

	err := models.DB.Find(&dirs).Error
	if err != nil && err == gorm.ErrRecordNotFound {
		return Response{
			Status: 404,
			Msg:    "暂时没有配置目录",
			Data:   nil,
		}
	} else if err != nil {
		return Response{
			Status: 500,
			Msg:    "异常:" + err.Error(),
			Data:   nil,
		}
	}

	return Response{
		Status: 200,
		Msg:    "获取目录成功",
		Data:   dirs,
	}
}

// 更新目录
func (a *App) UpdateDir(id int, formData string) Response {
	var dir models.Dir
	var err error

	// 解析数据
	if err = json.Unmarshal([]byte(formData), &dir); err != nil {
		return Response{
			Status: 500,
			Msg:    "异常:" + err.Error(),
			Data:   nil,
		}
	}

	// 找到原来的记录
	var dbDir models.Dir
	err = models.DB.First(&dbDir, id).Error
	if err != nil && err == gorm.ErrRecordNotFound {
		return Response{
			Status: 404,
			Msg:    "没有这个目录",
			Data:   nil,
		}
	} else if err != nil {
		return Response{
			Status: 500,
			Msg:    "异常:" + err.Error(),
			Data:   nil,
		}
	}

	if dir.Title != "" && dir.Title != dbDir.Title {
		// 唯一校验
		if unique, _ := models.UniqueCheck("title", dir.Title, &models.Dir{}); !unique {
			return Response{
				Status: 400,
				Msg:    "",
				Data:   nil,
			}
		}
		dbDir.Title = dir.Title
	}

	if dir.Url != "" && dir.Url != dbDir.Url {
		// 唯一校验
		if unique, _ := models.UniqueCheck("title", dir.Url, &models.Dir{}); !unique {
			return Response{
				Status: 400,
				Msg:    "",
				Data:   nil,
			}
		}
		dbDir.Url = dir.Url
	}

	// 保存
	err = models.DB.Save(&dbDir).Error
	if err != nil {
		return Response{
			Status: 500,
			Msg:    "",
			Data:   nil,
		}
	}

	return Response{
		Status: 200,
		Msg:    "",
		Data:   nil,
	}
}

// 删除目录
func (a *App) DeleteDir(id int) Response {
	var dir models.Dir
	models.DB.First(&dir, id)

	err := models.DB.Delete(&dir).Error
	if err != nil {
		return Response{
			Status: 500,
			Msg:    "异常:" + err.Error(),
			Data:   nil,
		}
	}

	return Response{
		Status: 200,
		Msg:    "删除成功",
		Data:   nil,
	}
}

// 新增目录
func (a *App) CreateDir(formData string) Response {
	var dir models.Dir
	var err error

	err = json.Unmarshal([]byte(formData), &dir)
	if err != nil {
		return Response{
			Status: 500,
			Msg:    "",
			Data:   nil,
		}
	}

	// 唯一校验
	if unique, _ := models.UniqueCheck("title", dir.Title, &models.Dir{}); !unique {
		return Response{
			Status: 400,
			Msg:    "",
			Data:   nil,
		}
	}

	if unique, _ := models.UniqueCheck("url", dir.Url, &models.Dir{}); !unique {
		return Response{
			Status: 400,
			Msg:    "",
			Data:   nil,
		}
	}

	err = models.DB.Create(&dir).Error
	if err != nil {
		return Response{
			Status: 500,
			Msg:    "",
			Data:   nil,
		}
	}

	// 拉取歌曲列表
	fileList, err := a.client.GetFileList(dir.ID)
	if err != nil {
		return Response{
			Status: 500,
			Msg:    "",
			Data:   nil,
		}
	}

	for _, file := range fileList {
		song := models.Song{
			Title:  file.Name,
			Artist: file.Artist,
			Path:   file.Path, // 文件路径
			Dir:    dir.ID,
			Size:   file.Size, // 文件大小，单位 MB
			Type:   file.Type, // 文件类型
		}

		_ = models.DB.Create(&song).Error
	}

	return Response{
		Status: 200,
		Msg:    "",
		Data:   nil,
	}
}

// 手动同步歌曲列表
func (a *App) ReSyncDir(id int) Response {
	// 获取数据库中已存在的歌曲
	var songs []models.Song

	err := models.DB.Find(&songs, "dir = ?", id).Error
	if err != nil {
		return NewResponse(500, "", nil)
	}

	// 拉取服务中的歌曲列表
	serverFileList, err := a.client.GetFileList(id)
	if err != nil {
		return NewResponse(500, "", nil)
	}

	// 如果服务中没有则删除数据库中已有的歌曲
	if len(serverFileList) == 0 {
		err := models.DB.Delete(models.Song{}, "dir = ?", id).Error
		if err != nil {
			return NewResponse(500, "", nil)
		}

		return NewResponse(200, "", nil)
	}

	// 检查服务中的歌曲是否存在于本地数据库，不在则添加，在则对比并更新
	dbPathMap := map[string]models.Song{}
	for _, song := range songs {
		dbPathMap[song.Path] = song
	}
	serverPathMap := map[string]FileInfo{}
	for _, file := range serverFileList {
		serverPathMap[file.Path] = file
	}

	// 同步逻辑
	err = models.DB.Transaction(func(tx *gorm.DB) error {
		// 更新或添加新的歌曲
		for _, file := range serverFileList {
			if dbSong, exists := dbPathMap[file.Path]; exists {
				// 更新存在的歌曲
				if dbSong.Size != file.Size || dbSong.Type != file.Type {
					dbSong.Size = file.Size
					dbSong.Type = file.Type
					if err := tx.Save(&dbSong).Error; err != nil {
						return err
					}
				}
			} else {
				// 添加新的歌曲
				newSong := models.Song{
					Title:  file.Name,
					Artist: file.Artist,
					Path:   file.Path,
					Dir:    id,
					Size:   file.Size,
					Type:   file.Type,
				}
				if err := tx.Create(&newSong).Error; err != nil {
					return err
				}
			}
		}

		// 删除服务器上不存在的歌曲
		for _, song := range songs {
			if _, exists := serverPathMap[song.Path]; !exists {
				if err := tx.Delete(&song).Error; err != nil {
					return err
				}
			}
		}
		return nil
	})

	if err != nil {
		return NewResponse(500, "", nil)
	}

	return NewResponse(200, "", nil)
}
