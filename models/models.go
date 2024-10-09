package models

import (
	"errors"
	"fmt"
	"time"

	"gorm.io/gorm"
)

// 基础模型
type Model struct {
	ID        int            `gorm:"primaryKey" json:"id"`            // ID
	CreateAt  time.Time      `gorm:"autoCreateTime" json:"create_at"` // 创建时间
	UpdatedAt time.Time      `gorm:"autoUpdateTime" json:"update_at"` // 更新时间
	DeleteAt  gorm.DeletedAt `gorm:"index" json:"delete_at"`          // 删除时间
}

// 连接配置
type Connection struct {
	Title    string `gorm:"not null" json:"title"`    // 标题
	Protocol string `gorm:"not null" json:"protocol"` // 连接协议
	Address  string `json:"address"`                  // 地址/URL
	Username string `json:"username"`                 // 用户名
	Password string `json:"password"`                 // 密码

	Model
}

// 目录管理
type Dir struct {
	Title string `gorm:"not null" json:"title"` // 标题
	Url   string `gorm:"not null" json:"url"`   // 资源目录

	Model
}

// 歌曲
type Song struct {
	Title  string  `gorm:"not null" json:"title"`          // 标题
	Artist string  `json:"artist"`                         // 作者
	Album  string  `json:"album"`                          // 专辑
	Type   string  `gorm:"not null" json:"type"`           // 文件类型
	Size   float64 `grom:"not null" json:"size"`           // 大小
	Dir    int     `gorm:"not null" json:"dir"`            // 目录
	Time   int     `gorm:"not null,default=0" json:"time"` // 时长
	Path   string  `gorm:"not null,default=/" json:"path"` // 位置url

	Model
}

func UniqueCheck(key string, value interface{}, model interface{}) (bool, error) {
	// 使用格式化查询条件
	condition := fmt.Sprintf("%s = ?", key)

	// 查找数据库
	err := DB.Where(condition, value).First(model).Error

	// 如果没有找到记录，表示唯一
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return true, nil
	}

	// 如果是其他错误，返回 false 和错误信息
	if err != nil {
		return false, err
	}

	// 否则，说明找到了记录，不是唯一
	return false, nil
}
