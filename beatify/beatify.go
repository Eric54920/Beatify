package beatify

import (
	"Beatify/models"
	"context"
)

// App struct
type App struct {
	ctx    context.Context
	client Connection
}

func InitBeatify() *App {
	// 初始化数据库
	err := models.InitDB()
	if err != nil {
		panic(err.Error())
	}

	return &App{
		client: GetClient(),
	}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) Startup(ctx context.Context) {
	a.ctx = ctx
}
