package beatify

import (
	"context"
)

// App struct
type App struct {
	ctx    context.Context
	client Connector
}

func InitBeatify() *App {
	// 初始化数据库
	err := InitDB()
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

	a.StartServer()
}
