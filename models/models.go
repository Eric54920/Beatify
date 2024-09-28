package models

import (
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
