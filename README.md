<div align="center">

<img src="./src-tauri/icons/icon.svg" alt="Beatify" width="100" style="border-radius:22px" />

# Beatify

**A modern, native desktop music player built with Tauri 2, Rust, and React.**

Inspired by Apple Music — sortable library, sources (local + WebDAV), albums & artists views, synced lyrics with a blurred-cover overlay, shuffle / repeat, light/dark/system themes, and English/中文 UI.

[**English**](./README.md) · [中文](./README.zh.md)

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

## Table of contents

- [🎵 Beatify](#-beatify)
  - [Table of contents](#table-of-contents)
  - [Features](#features)
    - [Library](#library)
    - [Playback](#playback)
    - [Lyrics](#lyrics)
    - [Settings \& polish](#settings--polish)
  - [Screenshots](#screenshots)
  - [Prerequisites](#prerequisites)
  - [Getting started](#getting-started)
  - [Build for production](#build-for-production)
  - [Supported audio formats](#supported-audio-formats)
  - [Contributing](#contributing)
  - [License](#license)

## Features

### Library
- Multi-folder local library; recursive scan that ignores file changes that haven't actually changed (modification-time check) for fast re-scans
- File-system watching (`notify`): folders rescan automatically when files are added / changed / deleted; missing tracks are removed
- Multiple **WebDAV** remote sources alongside local folders. Each source can have its own credentials; lyrics + cover art are extracted and cached during sync
- Library, **Albums** (grid + detail), and **Artists** (left list + right detail) views
- Sortable Library columns: Title / Artist / Album / Format / Size / Time / Plays — click headers to sort, click again to reverse

### Playback
- Cross-format playback (FLAC, MP3, AAC/M4A, OGG, Opus, WAV, ALAC, AIFF …) via [`rodio`](https://crates.io/crates/rodio) with the [`symphonia-all`](https://crates.io/crates/symphonia) backend
- Remote playback authenticates and streams from WebDAV servers
- Persistent **Up Next** queue + **Recently Played** history; combined side panel (history on top, queue below)
- **Shuffle** + 3-state **repeat** (off / list / one) with persisted preference
- Apple Music-style floating glass player bar; track title, artist and album on one line with a thin inline scrubber

### Lyrics
- Lyrics extracted from tag metadata (ID3 `USLT`, Vorbis `LYRICS` / `UNSYNCEDLYRICS`, MP4 `©lyr`) and cached to the database
- Full-window slide-up overlay with a blurred album cover background
- Synced **LRC** support (`[mm:ss.xx]`): active line auto-scrolls and scales up; unsynced lyrics fall back to plain rendering
- Smooth GPU-accelerated transform-based scroll (no native `scrollTop` jitter)
- Drag from anywhere on the lyrics page to move the window

### Settings & polish
- **Light / dark / system** theme with no flash-of-wrong-colors at startup
- **English / 中文** language switch with a small built-in dictionary — switches instantly
- Per-source confirmation dialogs for any destructive action (remove folder, remove server, clear queue, clear history)
- Frameless window on macOS (overlay title bar) — drag the window from any non-interactive area at the top
- Cover art cached as data URLs; embedded covers extracted from tags

## Screenshots

![Library view](docs/screenshots/library.jpg)
![Album view](docs/screenshots/album.jpg)
![Artist view](docs/screenshots/artist.jpg)
![Resource view](docs/screenshots/resource.jpg)
![Lyrics view](docs/screenshots/lyrics.jpg)

## Prerequisites

- **Rust** ≥ 1.77 (latest stable recommended) — install via [rustup](https://rustup.rs/)
- **Node.js** ≥ 20 (we test on 21.x) and **npm** ≥ 10
- **Tauri 2 platform dependencies** — see the [Tauri prerequisites guide](https://v2.tauri.app/start/prerequisites/) for your OS
  - macOS: Xcode Command Line Tools (`xcode-select --install`)
  - Linux: `webkit2gtk-4.1`, `librsvg2-dev`, `libssl-dev`, `gcc`, `pkg-config`, … (full list in the Tauri docs)
  - Windows: Microsoft Edge WebView2 + MSVC build tools

## Getting started

```bash
# 1. install JS deps
npm install

# 2. run dev (spawns Vite + cargo run; opens the native window)
npm run tauri dev
```

The first `cargo build` will be slow (compiling Tauri + rodio + symphonia from source). Subsequent rebuilds are incremental and quick.

Vite serves the UI on `http://localhost:1420` and hot-reloads frontend changes. Rust changes trigger an automatic `cargo build` + relaunch via the Tauri CLI's file watcher.

## Build for production

```bash
npm run tauri build
```

This produces a notarisation-ready bundle under `src-tauri/target/release/bundle/` (`.dmg` on macOS, `.msi` / `.exe` on Windows, `.deb` / `.AppImage` on Linux). Replace the placeholder icons under [`src-tauri/icons/`](src-tauri/icons/) before shipping.

## Supported audio formats

`mp3`, `flac`, `m4a`, `m4b`, `aac`, `ogg`, `oga`, `opus`, `wav`, `wma`, `alac`, `ape`, `aiff`.

If the format isn't decoded by `symphonia` (or your build doesn't include the feature), playback will fail gracefully with an error toast.

## Contributing

Issues and PRs are welcome for noncommercial use. Please:

1. Run `npm run build` and `cargo build` before opening a PR to make sure the project builds cleanly
2. Match the existing code style; the project deliberately uses no comments unless the *why* is non-obvious
3. For any new strings, add entries to **both** `en` and `zh` dictionaries in [`src/lib/i18n.ts`](src/lib/i18n.ts)

## License

Beatify is licensed under the [PolyForm Noncommercial License 1.0.0](./LICENSE). You may use, copy, modify, and redistribute it freely for **any noncommercial purpose** — personal use, hobby projects, research, education and noncommercial organisations.

**Commercial use is not permitted under this license.** If you need a commercial licence, please open an issue to start a conversation.

The license does not affect any "fair use" rights you have under applicable law.
