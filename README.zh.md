<div align="center">

<img src="./src-tauri/icons/icon.svg" alt="Beatify" width="100" style="border-radius:22px" />

# Beatify

**基于 Tauri 2 + Rust + React 构建的现代化原生桌面音乐播放器。**

灵感来自 Apple Music —— 可排序的资料库、本地与 WebDAV 远程源、专辑/艺人视图、带模糊封面的逐行歌词、随机/循环、浅/深/跟随系统主题、中英双语界面。

[English](./README.md) · [**简体中文**](./README.zh.md)

</div>

<p align="center">
  <img alt="Tauri" src="https://img.shields.io/badge/Tauri-24C8DB?logo=tauri&logoColor=white" />
  <img alt="Rust" src="https://img.shields.io/badge/Rust-DEA584?logo=rust&logoColor=white" />
  <img alt="React" src="https://img.shields.io/badge/React-61DAFB?logo=react&logoColor=white" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white" />
  <img alt="Vite" src="https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white" />
  <img alt="Tailwind" src="https://img.shields.io/badge/Tailwind-38B2AC?logo=tailwindcss&logoColor=white" />
  <img alt="SQLite" src="https://img.shields.io/badge/SQLite-bundled-003B57?logo=sqlite&logoColor=white" />
  <img alt="License" src="https://img.shields.io/badge/License-PolyForm_Noncommercial-blue" />
</p>

---

## 目录

- [🎵 Beatify](#-beatify)
  - [目录](#目录)
  - [功能特性](#功能特性)
    - [资料库](#资料库)
    - [播放](#播放)
    - [歌词](#歌词)
    - [设置 \& 体验](#设置--体验)
  - [截图](#截图)
  - [前置条件](#前置条件)
  - [开发运行](#开发运行)
  - [打包](#打包)
  - [支持的音频格式](#支持的音频格式)
  - [贡献](#贡献)
  - [开源协议](#开源协议)

## 功能特性

### 资料库
- 多文件夹本地资料库；递归扫描并以 `mtime` 跳过未变化的文件，重扫描很快
- 基于 [`notify`](https://crates.io/crates/notify) 的文件系统监听：增/删/改自动同步，磁盘上不存在的曲目会从列表里删除
- 支持任意多个 **WebDAV** 远程源与本地文件夹并存。每个源单独账密；同步时一并提取并缓存封面 + 歌词
- 三种主视图：**资料库**、**专辑**（网格 + 详情）、**艺人**（左侧列表 + 右侧详情）
- 资料库可排序列：标题 / 艺人 / 专辑 / 格式 / 大小 / 时长 / 播放次数 —— 点击列头切换升降序

### 播放
- 通过 [`rodio`](https://crates.io/crates/rodio) + [`symphonia-all`](https://crates.io/crates/symphonia) 支持 FLAC / MP3 / AAC / M4A / OGG / Opus / WAV / ALAC / AIFF 等格式
- 远程曲目自动带认证、流式拉取
- 持久化的**待播列表**与**最近播放**，合并到一个侧边栏（上半历史 / 下半待播）
- **随机播放** + 三态**循环**（关 / 列表 / 单曲），切换状态会写入本地存储
- Apple Music 风格的悬浮毛玻璃播放栏；标题 / 艺人 / 专辑同一行展示，下方是内联进度条

### 歌词
- 从音频文件标签中读取（ID3 `USLT`、Vorbis `LYRICS` / `UNSYNCEDLYRICS`、MP4 `©lyr`）并缓存到 SQLite
- 全窗口自下而上滑出，背景是当前封面经过 100px 模糊 + 饱和度处理
- 支持标准 **LRC** 时间轴 (`[mm:ss.xx]`)：当前行自动滚动到中间、放大加粗；无时间轴的歌词原样展示
- 用 CSS `translate3d` + GPU 合成，滚动与缩放都很平滑，无原生 `scrollTop` 抖动
- 歌词页面的非交互区域均可拖动窗口

### 设置 & 体验
- **浅色 / 深色 / 跟随系统**三种主题，首屏脚本提前应用避免闪烁
- **English / 中文**即时切换，内置字典覆盖全部界面文字
- 所有破坏性操作都有二次确认弹窗（移除文件夹、移除远程源、清空待播、清空历史）
- macOS 下使用 `titleBarStyle: Overlay`，顶部非交互区域均为拖拽区
- 封面以 data URL 方式缓存渲染

## 截图

![资料库](docs/screenshots/library.jpg)
![专辑](docs/screenshots/album.jpg)
![艺人](docs/screenshots/artist.jpg)
![媒体库](docs/screenshots/resource.jpg)
![歌词](docs/screenshots/lyrics.jpg)

## 前置条件

- **Rust** ≥ 1.77（建议最新 stable）—— 通过 [rustup](https://rustup.rs/) 安装
- **Node.js** ≥ 20（CI 在 21.x 验证）+ **npm** ≥ 10
- **Tauri 2 各平台依赖** —— 参考 [Tauri 官方前置条件](https://v2.tauri.app/start/prerequisites/)
  - macOS：Xcode Command Line Tools (`xcode-select --install`)
  - Linux：`webkit2gtk-4.1`、`librsvg2-dev`、`libssl-dev`、`gcc`、`pkg-config` 等
  - Windows：Microsoft Edge WebView2 + MSVC 构建工具

## 开发运行

```bash
# 1. 安装前端依赖
npm install

# 2. 启动开发模式（同时拉起 Vite 与 cargo run，自动打开窗口）
npm run tauri dev
```

首次 `cargo build` 时间较长（要从源码编译 Tauri + rodio + symphonia），增量构建很快。

Vite 在 `http://localhost:1420` 提供 UI 并热更新；改动 Rust 代码会触发 Tauri CLI 自动 `cargo build` 并重启原生程序。

## 打包

```bash
npm run tauri build
```

产物在 `src-tauri/target/release/bundle/` 下：macOS `.dmg`，Windows `.msi` / `.exe`，Linux `.deb` / `.AppImage`。发布前请替换 [`src-tauri/icons/`](src-tauri/icons/) 下的占位图标。

## 支持的音频格式

`mp3`、`flac`、`m4a`、`m4b`、`aac`、`ogg`、`oga`、`opus`、`wav`、`wma`、`alac`、`ape`、`aiff`。

`symphonia` 未支持的格式播放时会以错误 toast 优雅失败。

## 贡献

欢迎在非商业范围内提 Issue / PR。请注意：

1. 提交前请确保 `npm run build` 与 `cargo build` 通过
2. 代码风格与现有保持一致：只有解释“为什么”才写注释
3. 任何新增文案都要同时给 [`src/lib/i18n.ts`](src/lib/i18n.ts) 的 `en` 与 `zh` 字典加上对应键

## 开源协议

Beatify 采用 [PolyForm Noncommercial License 1.0.0](./LICENSE) 协议。你可以在**任何非商业目的**下自由使用、复制、修改、再发布 —— 包括个人使用、爱好项目、研究、教育与非商业组织。

**不允许任何商业使用。**如有商业授权需要，请通过 Issue 联系作者。

本协议不影响你在法律下可能享有的合理使用权利。
