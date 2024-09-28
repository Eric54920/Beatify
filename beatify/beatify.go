package beatify

import (
	"context"
)

// App struct
type App struct {
	ctx context.Context
}

func InitBeatify() *App {
	return &App{}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) Startup(ctx context.Context) {
	a.ctx = ctx
}
