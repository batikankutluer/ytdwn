<div align="center">

```
 ██╗   ██╗ ████████╗ ██████╗  ██╗    ██╗ ███╗   ██╗
 ╚██╗ ██╔╝ ╚══██╔══╝ ██╔══██╗ ██║    ██║ ████╗  ██║
  ╚████╔╝     ██║    ██║  ██║ ██║ █╗ ██║ ██╔██╗ ██║
   ╚██╔╝      ██║    ██║  ██║ ██║███╗██║ ██║╚██╗██║
    ██║       ██║    ██████╔╝ ╚███╔███╔╝ ██║ ╚████║
    ╚═╝       ╚═╝    ╚═════╝   ╚══╝╚══╝  ╚═╝  ╚═══╝
```

**A fast and simple CLI tool to download audio and video from YouTube**

[![npm version](https://img.shields.io/npm/v/ytdwn.svg)](https://www.npmjs.com/package/ytdwn)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

</div>

## ✨ Features

- 🎵 **Audio Downloads** - MP3, OPUS, M4A, FLAC, and more
- 🎥 **Video Downloads** - MP4, MKV, WebM with best quality *(new in v1.1.0)*
- ✂️ **Clip Sections** - Download only specific time ranges
- 📁 **Custom Folders** - Set a default download directory
- 🚀 **Fast Downloads** - Parallel fragment downloading
- 🎨 **Beautiful UI** - Gradient banner, spinners, progress bars
- 📦 **Auto-Setup** - Downloads yt-dlp binary automatically

## 📋 Requirements

- [Node.js](https://nodejs.org) >= 18.0.0 or [Bun](https://bun.sh) >= 1.0.0
- [FFmpeg](https://ffmpeg.org) (for video merging and audio conversion)

## 🚀 Quick Start

```bash
# Install globally
npm install -g ytdwn

# First-time setup (downloads yt-dlp)
ytdwn prepare

# Download audio (MP3)
ytdwn "https://www.youtube.com/watch?v=VIDEO_ID"

# Download video (MP4)
ytdwn "https://www.youtube.com/watch?v=VIDEO_ID" -f mp4
```

## 📖 Usage

### Basic Examples

```bash
# Download as MP3 (default)
ytdwn "https://youtube.com/watch?v=VIDEO_ID"

# Download as MP4 video
ytdwn "https://youtube.com/watch?v=VIDEO_ID" -f mp4

# Clip a specific section (1:30 to 2:45)
ytdwn "https://youtube.com/watch?v=VIDEO_ID" -c 1:30-2:45

# Download video clip
ytdwn "https://youtube.com/watch?v=VIDEO_ID" -f mp4 -c 1:30-2:45

# Quiet mode (outputs only filename)
ytdwn "https://youtube.com/watch?v=VIDEO_ID" -q
```

### Options

| Flag | Description | Example |
|------|-------------|---------|
| `-f, --format <format>` | Output format (mp3, mp4, mkv, etc.) | `-f mp4` |
| `-c, --clip <range>` | Clip time range | `-c 1:30-2:45` |
| `-q, --quiet` | Minimal output | `-q` |
| `-v, --version` | Show version | `-v` |
| `-h, --help` | Show help | `-h` |

### Commands

```bash
# Download yt-dlp binary
ytdwn prepare

# Set default download folder
ytdwn setDefaultFolder ~/Downloads/YouTube

# View current folder
ytdwn setDefaultFolder

# Reset to current directory
ytdwn setDefaultFolder --reset
```

### Supported Formats

| Type | Formats |
|------|---------|
| Audio | mp3, opus, m4a, flac, aac, wav |
| Video | mp4, mkv, webm, avi, mov |

## 🛠️ Installation Options

### npm / npx

```bash
# Run without installing
npx ytdwn prepare
npx ytdwn "https://youtube.com/watch?v=VIDEO_ID"

# Install globally
npm install -g ytdwn
```

### Bun

```bash
# Run without installing
bunx ytdwn prepare
bunx ytdwn "https://youtube.com/watch?v=VIDEO_ID"

# Install globally
bun add -g ytdwn
```

### From Source

```bash
git clone https://github.com/batikankutluer/ytdwn.git
cd ytdwn
bun install
bun run index.ts prepare
bun run index.ts "https://youtube.com/watch?v=VIDEO_ID"
```

## ⚙️ Configuration

Settings are stored in `~/.ytdwn.json`:

| Key | Description |
|-----|-------------|
| `downloadDir` | Default download folder |
| `binaryPath` | Cached path to yt-dlp |

## 🧪 Development

```bash
# Run tests
bun test

# Type check
bun run typecheck

# Build
bun run build
```

## 🛠️ Tech Stack

- **Runtime**: Node.js / Bun
- **Type Safety**: [Effect.TS](https://effect.website)
- **CLI**: [Commander.js](https://github.com/tj/commander.js)
- **Downloader**: [yt-dlp](https://github.com/yt-dlp/yt-dlp)
- **Binary Management**: [yt-dlp-wrap](https://github.com/foxesdocode/yt-dlp-wrap)

## 📄 License

MIT - see [LICENSE](LICENSE) for details

---

<div align="center">
Made with ❤️ by <a href="https://github.com/batikankutluer">Batikan Kutluer</a>
</div>
