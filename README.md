<div align="center">

<img src="./src-tauri/icons/icon.svg" alt="Beatify" width="96" style="border-radius:22px" />

# Beatify

**A clean, native desktop music player for local libraries and WebDAV servers.**

[English](./README.md) · [中文](./README.zh.md)

</div>

<p align="center">
  <img alt="Platform" src="https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-lightgrey" />
  <img alt="Tauri" src="https://img.shields.io/badge/built%20with-Tauri%202-24C8DB?logo=tauri&logoColor=white" />
  <img alt="License" src="https://img.shields.io/badge/license-MIT-green" />
</p>

---

## Features

- **Home dashboard** — library stats, recently played tracks & albums, most played, recently added, and a daily mix that refreshes every day
- **Local + remote library** — add local folders or WebDAV servers; the library updates automatically when files change on disk
- **Multi-view browsing** — Library (sortable columns), Albums (grid + tracklist), Artists (list + detail)
- **Broad format support** — FLAC, MP3, AAC/M4A, OGG, Opus, WAV, ALAC, AIFF, and more
- **Synced lyrics** — full-screen overlay with blurred album art; LRC timestamps scroll and highlight the active line smoothly
- **Up Next & History** — persistent queue and play history in a collapsible side panel
- **Shuffle & repeat** — off / list / one; remembered across sessions
- **Light / dark / system theme** — applied before first paint, no flash
- **English / 中文** — switch instantly, no restart needed

## Screenshots

![Home](docs/screenshots/home.jpg)
![Library](docs/screenshots/library.jpg)
![Albums](docs/screenshots/album.jpg)
![Artists](docs/screenshots/artist.jpg)
![Sources](docs/screenshots/resource.jpg)
![Lyrics](docs/screenshots/lyrics.jpg)

## Download

Pre-built installers for macOS, Windows, and Linux are on the [Releases](https://github.com/Eric54920/Beatify/releases) page.

## Development

**Prerequisites**

- [Rust](https://rustup.rs/) ≥ 1.77
- Node.js ≥ 20 + npm ≥ 10
- Platform-specific deps from the [Tauri prerequisites guide](https://v2.tauri.app/start/prerequisites/)

**Run locally**

```bash
npm install
npm run tauri dev
```

The first build takes a few minutes while Cargo compiles dependencies. Subsequent runs are incremental and fast.

**Build for production**

```bash
npm run tauri build
```

Output bundles land in `src-tauri/target/release/bundle/` — `.dmg` on macOS, `.msi`/`.exe` on Windows, `.deb`/`.AppImage` on Linux.

## FAQ

**Why won't a certain file play?**  
Beatify decodes audio via [Symphonia](https://github.com/pdeljanov/Symphonia). If your file uses a codec or container variant Symphonia doesn't support, playback will fail silently. Check the Symphonia repo for the full format matrix.

**Does it work on Windows and Linux?**  
The app builds and runs on all three platforms. Active testing is primarily on macOS, so Windows/Linux may have rough edges — bug reports are welcome.

**My WebDAV server uses a self-signed certificate. Will it connect?**  
Not currently — TLS validation is strict by default. Support for custom CA certificates is planned.

**Where does Beatify store its data?**  
Everything (library database, cached covers, settings) lives in the OS app data directory: `~/Library/Application Support/com.beatify.app` on macOS, `%APPDATA%\com.beatify.app` on Windows.

**macOS says "Beatify is damaged and can't be opened. You should move it to the Trash."**  
This is macOS Gatekeeper blocking an unsigned app — the binary itself is fine. Run the following command in Terminal to remove the quarantine flag, then double-click the app again:

```bash
xattr -cr /Applications/Beatify.app
```

If you installed it somewhere else, replace the path accordingly.

## Contributing

Issues and PRs are welcome.

1. Ensure `npm run build` and `cargo build` both pass before opening a PR
2. Any new UI strings must be added to both `en` and `zh` in [`src/lib/i18n.ts`](src/lib/i18n.ts)
3. Follow the existing code style — comments only when the *why* is non-obvious

## License

[MIT License](./LICENSE) — free to use, modify, and distribute for any purpose.
