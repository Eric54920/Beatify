package models

import (
	"fmt"
	"os"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

const path = "./db"
const dbPath = "./db/music.db"

var DB *gorm.DB

func IsExist(path string) bool {
	_, err := os.Stat(path)
	return err == nil || !os.IsNotExist(err)
}

func InitDB() error {
	// 检查数据库文件是否存在
	if !IsExist(path) {
		// 创建目录
		if err := os.Mkdir(path, 0755); err != nil {
			return err
		}
	}

	if !IsExist(dbPath) {
		// 创建文件
		file, err := os.Create(dbPath)
		if err != nil {
			return err
		}

		defer file.Close()
	}

	// 连接数据库
	var err error
	DB, err = gorm.Open(sqlite.Open(dbPath), &gorm.Config{})
	if err != nil {
		return err
	}

	// 迁移数据库
	DB.AutoMigrate(&Connection{}, &Dir{})
	fmt.Println("数据库初始化成功")
	return nil
}
