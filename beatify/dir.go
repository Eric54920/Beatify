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

	err = models.DB.Create(&dir).Error
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
