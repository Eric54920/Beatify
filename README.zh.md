<div align="center">

<img src="./src-tauri/icons/icon.svg" alt="Beatify" width="100" style="border-radius:22px" />

# Beatify

**基于 Tauri 2 + Rust + React 构建的现代化原生桌面音乐播放器。**

灵感来自 Apple Music —— 可排序的资料库、本地与 WebDAV 远程源、专辑/艺人视图、带模糊封面的逐行歌词、随机/循环、浅/深/跟随系统主题、中英双语界面。

[English](./README.md) · [**简体中文**](./README.zh.md)

</div>

<p align="center">
  <img alt="Tauri" src="https://img.shields.io/badge/Tauri-2.11-24C8DB?logo=tauri&logoColor=white" />
  <img alt="Rust" src="https://img.shields.io/badge/Rust-2021_edition-DEA584?logo=rust&logoColor=white" />
  <img alt="React" src="https://img.shields.io/badge/React-18.3-61DAFB?logo=react&logoColor=white" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white" />
  <img alt="Vite" src="https://img.shields.io/badge/Vite-6.4-646CFF?logo=vite&logoColor=white" />
  <img alt="Tailwind" src="https://img.shields.io/badge/Tailwind-3.4-38B2AC?logo=tailwindcss&logoColor=white" />
  <img alt="SQLite" src="https://img.shields.io/badge/SQLite-bundled-003B57?logo=sqlite&logoColor=white" />
  <img alt="License" src="https://img.shields.io/badge/License-PolyForm_Noncommercial_1.0-blue" />
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
  - [技术栈](#技术栈)
    - [Rust 端 (`src-tauri/Cargo.toml`)](#rust-端-src-tauricargotoml)
    - [前端 (`package.json`)](#前端-packagejson)
  - [前置条件](#前置条件)
  - [开发运行](#开发运行)
  - [打包](#打包)
  - [项目结构](#项目结构)
  - [数据存储](#数据存储)
  - [支持的音频格式](#支持的音频格式)
  - [快捷键与鼠标操作](#快捷键与鼠标操作)
  - [设置](#设置)
  - [Roadmap](#roadmap)
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

## 技术栈

### Rust 端 (`src-tauri/Cargo.toml`)

| Crate | 版本 | 用途 |
| --- | --- | --- |
| [`tauri`](https://crates.io/crates/tauri) | `2` | 桌面运行时 |
| [`tauri-build`](https://crates.io/crates/tauri-build) | `2` | 构建脚本 |
| [`tauri-plugin-dialog`](https://crates.io/crates/tauri-plugin-dialog) | `2` | 原生文件/文件夹选择 |
| [`tauri-plugin-opener`](https://crates.io/crates/tauri-plugin-opener) | `2` | 外部打开链接/文件 |
| [`rodio`](https://crates.io/crates/rodio) (`symphonia-all`) | `0.20` | 音频播放 |
| [`lofty`](https://crates.io/crates/lofty) | `0.22` | 音频标签读写 + 封面提取 |
| [`rusqlite`](https://crates.io/crates/rusqlite) (`bundled`) | `0.32` | 资料库 SQLite |
| [`reqwest`](https://crates.io/crates/reqwest) (`rustls-tls`, `blocking`) | `0.12` | HTTP / WebDAV |
| [`quick-xml`](https://crates.io/crates/quick-xml) | `0.36` | 解析 PROPFIND 响应 |
| [`notify`](https://crates.io/crates/notify) | `6` | 文件系统监听 |
| [`walkdir`](https://crates.io/crates/walkdir) | `2` | 递归遍历目录 |
| [`tokio`](https://crates.io/crates/tokio) (`full`) | `1` | 异步运行时 |
| [`serde`](https://crates.io/crates/serde) / [`serde_json`](https://crates.io/crates/serde_json) | `1` | 序列化 |
| [`anyhow`](https://crates.io/crates/anyhow) / [`thiserror`](https://crates.io/crates/thiserror) | `1` | 错误处理 |
| [`parking_lot`](https://crates.io/crates/parking_lot) | `0.12` | 高性能锁 |
| [`uuid`](https://crates.io/crates/uuid) (`v4`) | `1` | 曲目 / 源 ID |
| [`chrono`](https://crates.io/crates/chrono) (`serde`) | `0.4` | 时间戳 |
| [`base64`](https://crates.io/crates/base64) | `0.22` | 封面 data URL 编码 |
| [`percent-encoding`](https://crates.io/crates/percent-encoding) | `2` | WebDAV URL 解码 |
| [`url`](https://crates.io/crates/url) | `2` | URL 解析 |
| [`mime_guess`](https://crates.io/crates/mime_guess) | `2` | MIME 推断 |
| [`log`](https://crates.io/crates/log) / [`env_logger`](https://crates.io/crates/env_logger) | `0.4` / `0.11` | 日志 |

### 前端 (`package.json`)

| 包 | 版本 | 用途 |
| --- | --- | --- |
| [`react`](https://www.npmjs.com/package/react) / [`react-dom`](https://www.npmjs.com/package/react-dom) | `^18.3.1` | UI 库 |
| [`@tauri-apps/api`](https://www.npmjs.com/package/@tauri-apps/api) | `^2.2.0` | JS ↔ Rust 桥接 |
| [`@tauri-apps/plugin-dialog`](https://www.npmjs.com/package/@tauri-apps/plugin-dialog) | `^2.2.0` | 文件夹选择对话框 |
| [`@tauri-apps/plugin-opener`](https://www.npmjs.com/package/@tauri-apps/plugin-opener) | `^2.2.6` | 外部链接打开 |
| [`zustand`](https://www.npmjs.com/package/zustand) | `^5.0.3` | 状态管理 |
| [`lucide-react`](https://www.npmjs.com/package/lucide-react) | `^0.475.0` | 图标 |
| [`@radix-ui/react-*`](https://www.radix-ui.com/) | `^1 / 2` | 无障碍基础组件 |
| [`class-variance-authority`](https://www.npmjs.com/package/class-variance-authority) | `^0.7.1` | shadcn 风格的 variant 工具 |
| [`tailwind-merge`](https://www.npmjs.com/package/tailwind-merge) | `^2.6.0` | Tailwind 类名合并 |
| [`tailwindcss-animate`](https://www.npmjs.com/package/tailwindcss-animate) | `^1.0.7` | Tailwind 动画工具类 |
| [`vite`](https://www.npmjs.com/package/vite) | `^6.1.0` | 开发服务器 / 打包 |
| [`@vitejs/plugin-react`](https://www.npmjs.com/package/@vitejs/plugin-react) | `^4.3.4` | React HMR |
| [`tailwindcss`](https://www.npmjs.com/package/tailwindcss) | `^3.4.17` | 样式 |
| [`typescript`](https://www.npmjs.com/package/typescript) | `^5.7.3` | 类型检查 |
| [`autoprefixer`](https://www.npmjs.com/package/autoprefixer) / [`postcss`](https://www.npmjs.com/package/postcss) | `^10 / ^8` | CSS 流水线 |

UI 基础组件用 [shadcn/ui](https://ui.shadcn.com/) 风格直接写在 `src/components/ui/`，不依赖额外的包。

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

## 项目结构

```
beatify/
├── src/                       # React UI (TypeScript)
│   ├── App.tsx                # 顶层布局 + 标题栏拖拽
│   ├── components/
│   │   ├── PlayerBar.tsx      # 悬浮玻璃播放栏
│   │   ├── SidePanel.tsx      # 历史 + 待播 合并侧边栏
│   │   ├── LyricsOverlay.tsx  # 上滑歌词全屏页
│   │   ├── TrackList.tsx      # 可排序歌曲列表
│   │   ├── MetadataEditor.tsx # 标签编辑器（本地文件会写回）
│   │   ├── CoverArt.tsx       # 封面缓存渲染
│   │   ├── Sidebar.tsx        # 资料库 / 专辑 / 艺人 / 媒体源 / 设置
│   │   └── views/             # 各主视图
│   ├── lib/
│   │   ├── api.ts             # Tauri invoke 的类型化封装
│   │   ├── i18n.ts            # en / zh 字典 + useT()
│   │   ├── grouping.ts        # deriveAlbums / deriveArtists
│   │   └── utils.ts           # cn / formatTime / formatBytes
│   ├── store/
│   │   ├── player.ts          # zustand：队列、播放状态、视图、面板
│   │   └── settings.ts        # 主题 / 语言 / 随机 / 循环（持久化）
│   ├── hooks/
│   │   ├── use-confirm.tsx    # Promise 风格的二次确认
│   │   └── use-toast.tsx      # Toast Provider + hook
│   └── types/                 # 与 Rust 同步的共享类型
│
├── src-tauri/                 # Rust 后端
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   ├── capabilities/
│   │   └── default.json       # 权限授予（窗口拖拽等）
│   └── src/
│       ├── lib.rs             # Tauri 启动 + 命令注册
│       ├── audio.rs           # rodio 引擎、传输控制、进度
│       ├── library.rs         # 本地扫描 (walkdir + lofty)
│       ├── webdav.rs          # PROPFIND + 同步 + 鉴权 GET
│       ├── metadata.rs        # 标签读写 / 封面 / 歌词提取
│       ├── lyrics.rs          # LRC 解析
│       ├── db.rs              # SQLite Schema / 查询 / 迁移
│       ├── watcher.rs         # notify 文件监听
│       ├── commands.rs        # #[tauri::command] 接口面
│       ├── state.rs           # AppState（db / audio / watcher / 路径）
│       ├── model.rs           # 与 UI 共享的 Serde 结构
│       └── error.rs           # AppError + IPC 序列化
└── package.json
```

## 数据存储

用户数据存放在 Tauri 的应用数据目录（macOS：`~/Library/Application Support/com.beatify.app/`）：

- `beatify.sqlite` —— 资料库、待播、历史、文件夹、远程源
- `covers/{track_id}` —— 远程曲目封面缓存（本地曲目按需从文件读取）

SQLite 启用 WAL 与外键级联；schema 通过 `ALTER TABLE ADD COLUMN` 尽力前向迁移。

## 支持的音频格式

`mp3`、`flac`、`m4a`、`m4b`、`aac`、`ogg`、`oga`、`opus`、`wav`、`wma`、`alac`、`ape`、`aiff`。

`symphonia` 未支持的格式播放时会以错误 toast 优雅失败。

## 快捷键与鼠标操作

- **双击**列表行 → 以当前视图顺序作为队列开始播放
- **双击**窗口顶部 → 最大化 / 还原
- 歌词页面**按 Esc** → 关闭
- 同步歌词时**点击某一行** → seek 到该时间
- 点击进度条任意处 → seek；按住拖动 → 拖动调整

## 设置

应用内即可配置大部分行为：

- **设置 → 外观** → 浅色 / 深色 / 跟随系统
- **设置 → 语言** → English / 中文
- **媒体源 → 添加文件夹** → 选任意目录，子目录自动递归
- **媒体源 → 添加 WebDAV** → 服务器 URL + 可选用户名/密码（自签证书亦兼容）

持久化偏好（主题、语言、随机、循环）写入 `localStorage`；其它数据写入 SQLite。

## Roadmap

- 🎵 播放列表（用户自定义歌单）
- ☁️ 更多远程协议（SMB、S3 兼容）
- 🎶 无缝播放 / 交叉淡入淡出
- 🔍 在线元数据查询（MusicBrainz）
- 📺 迷你播放器 / 总在最前
- 🎨 跟随封面自适应主题色

## 贡献

欢迎在非商业范围内提 Issue / PR。请注意：

1. 提交前请确保 `npm run build` 与 `cargo build` 通过
2. 代码风格与现有保持一致：只有解释“为什么”才写注释
3. 任何新增文案都要同时给 [`src/lib/i18n.ts`](src/lib/i18n.ts) 的 `en` 与 `zh` 字典加上对应键

## 开源协议

Beatify 采用 [PolyForm Noncommercial License 1.0.0](./LICENSE) 协议。你可以在**任何非商业目的**下自由使用、复制、修改、再发布 —— 包括个人使用、爱好项目、研究、教育与非商业组织。

**不允许任何商业使用。**如有商业授权需要，请通过 Issue 联系作者。

本协议不影响你在法律下可能享有的合理使用权利。
