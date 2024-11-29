package main

import (
	"Beatify/beatify"
	"embed"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
)

//go:embed all:frontend/dist
var assets embed.FS
var err error

func main() {
	// 初始化App
	app := beatify.InitBeatify()

	// Create application with options
	err = wails.Run(&options.App{
		Title:    "Beatify",
		Width:    1150,
		MinWidth: 1150,
		Height:   710,
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		BackgroundColour: &options.RGBA{R: 27, G: 38, B: 54, A: 1},
		OnStartup:        app.Startup,
		Bind: []interface{}{
			app,
		},
	})

	if err != nil {
		println("Error:", err.Error())
	}
}
