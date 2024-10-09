package beatify

import (
	"Beatify/models"
	"encoding/json"
	"fmt"

	"gorm.io/gorm"
)

type FileInfo struct {
	Name   string  `json:"name"`
	Artist string  `json:"artist"`
	Isdir  bool    `json:"isdir"`
	Path   string  `json:"path"`
	Size   float64 `json:"size"`
	Type   string  `json:"type"`
	UTime  string  `json:"utime"`
}

var audioExtensions = []string{"mp3", "wav", "flac", "aac", "ogg", "m4a", "wma", "alac", "aiff"}

type Connection interface {
	GetFileList(dirId int)
}

func GetClient() Connection {

	var dbConnection models.Connection
	var err error
	var client Connection

	if err = models.DB.First(&dbConnection).Error; err != nil {
		fmt.Println(err.Error())
		return nil
	}

	// 创建连接
	switch dbConnection.Protocol {
	case "WebDAV":
		client, err = NewWebDAVClient(dbConnection.Address, dbConnection.Username, dbConnection.Password)
	}

	if err != nil {
		fmt.Println(err.Error())
		return nil
	}

	return client
}

// 检查连接是否存在，是否能连接到服务
func (a *App) IsExistConnection() Response {
	var connections []models.Connection
	err := models.DB.Find(&connections).Error

	switch {
	case err != nil:
		return Response{
			Status: 500,
			Msg:    "异常: " + err.Error(),
			Data:   nil,
		}
	case len(connections) == 0:
		return Response{
			Status: 200,
			Msg:    "没有已存在的连接配置",
			Data:   nil,
		}
	default:
		return Response{
			Status: 200,
			Msg:    "连接配置查询成功",
			Data:   connections,
		}
	}
}

// 添加一个连接配置
func (a *App) AddConnection(formData string) Response {
	var conf models.Connection
	var err error

	// 解析 formData 为连接配置
	// 假设 formData 是 JSON 格式的数据，使用 json.Unmarshal 将其解析为 models.Connection 结构
	if err = json.Unmarshal([]byte(formData), &conf); err != nil {
		return Response{
			Status: 400,
			Msg:    "无效的表单数据: " + err.Error(),
			Data:   nil,
		}
	}

	// 检查是否已经有连接配置
	if err = models.DB.First(&conf).Error; err != nil && err != gorm.ErrRecordNotFound {
		return Response{
			Status: 500,
			Msg:    "数据库查询异常: " + err.Error(),
			Data:   nil,
		}
	}

	// 如果配置已存在，不允许添加多个
	if err == nil {
		return Response{
			Status: 400,
			Msg:    "暂不支持多个连接配置",
			Data:   nil,
		}
	}

	// 创建新的连接配置
	if err := models.DB.Create(&conf).Error; err != nil {
		return Response{
			Status: 500,
			Msg:    "添加配置异常: " + err.Error(),
			Data:   nil,
		}
	}

	return Response{
		Status: 200,
		Msg:    "添加连接配置成功",
		Data:   conf,
	}
}
