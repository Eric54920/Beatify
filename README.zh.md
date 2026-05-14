<div align="center">

<img src="./src-tauri/icons/icon.svg" alt="Beatify" width="96" style="border-radius:22px" />

# Beatify

**简洁、原生的桌面音乐播放器，支持本地资料库与 WebDAV 远程源。**

[English](./README.md) · [中文](./README.zh.md)

</div>

<p align="center">
  <img alt="Platform" src="https://img.shields.io/badge/平台-macOS%20%7C%20Windows%20%7C%20Linux-lightgrey" />
  <img alt="Tauri" src="https://img.shields.io/badge/基于-Tauri%202-24C8DB?logo=tauri&logoColor=white" />
  <img alt="License" src="https://img.shields.io/badge/协议-PolyForm%20Noncommercial-blue" />
</p>

---

## 功能特性

- **本地 + 远程资料库** — 添加本地文件夹或 WebDAV 服务器；文件变化时资料库自动同步
- **多视图浏览** — 资料库（可排序列表）、专辑（网格 + 曲目列表）、艺人（左侧列表 + 右侧详情）
- **广泛格式支持** — FLAC、MP3、AAC/M4A、OGG、Opus、WAV、ALAC、AIFF 等
- **逐行歌词** — 全屏覆盖层 + 模糊封面背景；LRC 时间轴自动滚动并高亮当前行
- **待播与历史** — 持久化的播放队列与播放记录，收纳在可折叠侧边栏中
- **随机与循环** — 关 / 列表 / 单曲，退出后仍保留设置
- **浅色 / 深色 / 跟随系统** — 启动前即应用，无闪烁
- **中文 / English** — 即时切换，无需重启

## 截图

![资料库](docs/screenshots/library.jpg)
![专辑](docs/screenshots/album.jpg)
![艺人](docs/screenshots/artist.jpg)
![媒体源](docs/screenshots/resource.jpg)
![歌词](docs/screenshots/lyrics.jpg)

## 下载

macOS、Windows、Linux 的安装包发布在 [Releases](https://github.com/Eric54920/Beatify/releases) 页面。

## 开发

**前置条件**

- [Rust](https://rustup.rs/) ≥ 1.77
- Node.js ≥ 20 + npm ≥ 10
- 各平台依赖参考 [Tauri 官方前置条件指南](https://v2.tauri.app/start/prerequisites/)

**本地运行**

```bash
npm install
npm run tauri dev
```

首次构建需要几分钟（Cargo 编译依赖），后续为增量构建，速度很快。

**生产打包**

```bash
npm run tauri build
```

产物在 `src-tauri/target/release/bundle/` 下：macOS `.dmg`，Windows `.msi` / `.exe`，Linux `.deb` / `.AppImage`。

## 常见问题

**某个文件无法播放？**  
Beatify 使用 [Symphonia](https://github.com/pdeljanov/Symphonia) 解码音频。若你的文件使用了 Symphonia 尚不支持的编解码器或容器格式，播放会静默失败。可在 Symphonia 仓库查阅完整的格式支持列表。

**支持 Windows 和 Linux 吗？**  
三个平台均可构建运行，但主要在 macOS 上测试，Windows/Linux 可能存在一些小问题，欢迎提 Issue 反馈。

**WebDAV 服务器使用自签名证书，能连上吗？**  
暂不支持 — 目前 TLS 验证严格执行，自定义 CA 证书的支持在规划中。

**数据存储在哪里？**  
资料库数据库、封面缓存和设置均存储在系统应用数据目录：macOS 为 `~/Library/Application Support/com.beatify.app`，Windows 为 `%APPDATA%\com.beatify.app`。

## 贡献

欢迎在非商业范围内提 Issue 或 PR。

1. 提交前请确保 `npm run build` 与 `cargo build` 均通过
2. 任何新增界面文字必须同时在 [`src/lib/i18n.ts`](src/lib/i18n.ts) 的 `en` 与 `zh` 字典中添加对应键值
3. 遵循现有代码风格 — 只有解释"为什么"时才写注释

## 开源协议

[PolyForm Noncommercial License 1.0.0](./LICENSE) — 可在个人、教育及其他非商业目的下自由使用。商业使用不在此协议范围内，如有需要请通过 Issue 联系作者。
