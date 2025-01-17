package beatify

import (
	"encoding/json"

	"gorm.io/gorm"
)

// 获取所有播放列表
func (a *App) GetAllDirs() Response {
	var dirs []Dir

	err := DB.Find(&dirs).Error
	if err != nil {
		return NewResponse(50000, nil)
	}

	return NewResponse(20000, dirs)
}

// 根据id获取播放列表
func (a *App) GetDir(id int) Response {
	var dir Dir

	err := DB.First(&dir, id).Error
	if err != nil {
		return NewResponse(50000, nil)
	}

	return NewResponse(20000, dir)
}

// 更新播放列表
func (a *App) UpdateDir(id int, formData string) Response {
	var dir Dir
	var err error

	// 解析数据
	if err = json.Unmarshal([]byte(formData), &dir); err != nil {
		return NewResponse(40000, nil)
	}

	// 找到原来的记录
	var dbDir Dir
	err = DB.First(&dbDir, id).Error
	if err != nil && err == gorm.ErrRecordNotFound {
		return NewResponse(40004, nil)
	} else if err != nil {
		return NewResponse(50000, nil)
	}

	if dir.Title != "" && dir.Title != dbDir.Title {
		// 唯一校验
		if unique, _ := UniqueCheck("title", dir.Title, &Dir{}); !unique {
			return NewResponse(40001, nil)
		}
		dbDir.Title = dir.Title
	}

	if dir.Url != "" && dir.Url != dbDir.Url {
		// 唯一校验
		if unique, _ := UniqueCheck("title", dir.Url, &Dir{}); !unique {
			return NewResponse(40001, nil)
		}
		dbDir.Url = dir.Url
	}

	// 保存
	err = DB.Save(&dbDir).Error
	if err != nil {
		return NewResponse(50001, nil)
	}

	return NewResponse(20000, nil)
}

// 删除播放列表
func (a *App) DeleteDir(id int) Response {
	var dir Dir

	err := DB.First(&dir, id).Error
	if err != nil {
		return NewResponse(50000, nil)
	}

	// 删除所有关联的歌曲
	err = DB.Where("dir = ?", id).Delete(&Song{}).Error
	if err != nil {
		return NewResponse(50000, nil)
	}

	// 删除列表
	err = DB.Delete(&dir).Error
	if err != nil {
		return NewResponse(50000, nil)
	}

	return NewResponse(20000, nil)
}

// 新增播放列表
func (a *App) CreateDir(formData string) Response {
	var dir Dir
	var err error

	err = json.Unmarshal([]byte(formData), &dir)
	if err != nil {
		return NewResponse(40000, nil)
	}

	// 唯一校验
	if unique, _ := UniqueCheck("title", dir.Title, &Dir{}); !unique {
		return NewResponse(40001, nil)
	}

	if unique, _ := UniqueCheck("url", dir.Url, &Dir{}); !unique {
		return NewResponse(40001, nil)
	}

	err = DB.Create(&dir).Error
	if err != nil {
		return NewResponse(50000, nil)
	}

	// 拉取歌曲列表
	fileList, err := a.client.GetFileList(dir.ID)
	if err != nil {
		return NewResponse(50004, nil)
	}

	for _, file := range fileList {
		err := CreateSong(file, dir.ID)

		if err != nil {
			return NewResponse(50005, nil)
		}
		// 更新元信息
		go a.client.fetchMetaData(file.Path)
	}

	return NewResponse(20000, nil)
}

// 手动同步歌曲列表
func (a *App) ReSyncDir(id int) Response {
	// 获取数据库中已存在的歌曲
	var songs []Song

	err := DB.Find(&songs, "dir = ?", id).Error
	if err != nil {
		return NewResponse(50002, nil)
	}

	// 拉取服务中的歌曲列表
	serverFileList, err := a.client.GetFileList(id)
	if err != nil {
		return NewResponse(50003, nil)
	}

	// 如果服务中没有则删除数据库中已有的歌曲
	if len(serverFileList) == 0 {
		err := DB.Delete(&Song{}, "dir = ?", id).Error
		if err != nil {
			return NewResponse(50000, nil)
		}

		return NewResponse(20000, nil)
	}

	// 检查服务中的歌曲是否存在于本地数据库，不在则添加，在则对比并更新
	dbPathMap := map[string]Song{}
	for _, song := range songs {
		dbPathMap[song.Path] = song
	}
	serverPathMap := map[string]FileInfo{}
	for _, file := range serverFileList {
		serverPathMap[file.Path] = file
	}

	// 同步逻辑
	err = DB.Transaction(func(tx *gorm.DB) error {
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
					go a.client.fetchMetaData(file.Path)
				}
			} else {
				// 添加新的歌曲
				err := CreateSong(file, id)

				if err != nil {
					return err
				}

				go a.client.fetchMetaData(file.Path)
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
		return NewResponse(50004, nil)
	}

	return NewResponse(20000, nil)
}
