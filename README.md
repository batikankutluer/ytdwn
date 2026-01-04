# YTDWN

A fast and simple CLI tool to download audio from YouTube videos. Powered by [yt-dlp](https://github.com/yt-dlp/yt-dlp).

## ✨ Features

- 🎵 Download audio from YouTube in MP3 or other formats
- ✂️ Clip specific sections of videos (e.g., `1:30-2:45`)
- 📁 Set a default download folder
- 🚀 Fast parallel downloads with concurrent fragments
- 🎨 Beautiful progress bar and colored output
- 📦 Auto-downloads yt-dlp binary if not present

## 📋 Requirements

- [Node.js](https://nodejs.org) >= 18.0.0 or [Bun](https://bun.sh) >= 1.0.0

## 🚀 Installation

### Using npm/npx

```bash
# Run directly without installing
npx ytdwn prepare
npx ytdwn https://www.youtube.com/watch?v=VIDEO_ID

# Or install globally
npm install -g ytdwn
ytdwn prepare
ytdwn https://www.youtube.com/watch?v=VIDEO_ID
```

### Using Bun

```bash
# Run directly without installing
bunx ytdwn prepare
bunx ytdwn https://www.youtube.com/watch?v=VIDEO_ID

# Or install globally
bun add -g ytdwn
ytdwn prepare
ytdwn https://www.youtube.com/watch?v=VIDEO_ID
```

### From Source

```bash
# Clone the repository
git clone https://github.com/batikankutluer/ytdwn.git
cd ytdwn

# Install dependencies
bun install

# Run directly from source (no build needed)
bun run index.ts prepare
bun run index.ts https://www.youtube.com/watch?v=VIDEO_ID

# Or build and use the compiled version
bun run build
node dist/index.js prepare
```

## 📖 Usage

### Basic Download

```bash
# Download audio from a YouTube URL
ytdwn https://www.youtube.com/watch?v=VIDEO_ID

# Or use the short form
ytdwn https://youtu.be/VIDEO_ID
```

### Options

| Flag                    | Description                    | Example          |
| ----------------------- | ------------------------------ | ---------------- |
| `-f, --format <format>` | Audio format (default: mp3)    | `-f opus`        |
| `-c, --clip <range>`    | Clip a specific time range     | `-c 01:30-02:45` |
| `-q, --quiet`           | Minimal output (only filename) | `-q`             |
| `-v, --version`         | Show version                   | `-v`             |
| `-h, --help`            | Show help                      | `-h`             |

### Examples

```bash
# Download as MP3 (default)
ytdwn https://www.youtube.com/watch?v=VIDEO_ID

# Download as OPUS format
ytdwn https://www.youtube.com/watch?v=VIDEO_ID -f opus

# Download only a portion (from 1:30 to 2:45)
ytdwn https://www.youtube.com/watch?v=VIDEO_ID -c 1:30-2:45

# Quiet mode - outputs only the filename
ytdwn https://www.youtube.com/watch?v=VIDEO_ID -q
```

### Commands

```bash
# Download and prepare yt-dlp binary
ytdwn prepare

# Set default download folder
ytdwn setDefaultFolder ~/Music/YouTube

# View current download folder
ytdwn setDefaultFolder

# Reset to current directory
ytdwn setDefaultFolder --reset
```

## ⚙️ Configuration

Settings are stored in `~/.ytdwn.json`:

- `downloadDir`: Default folder for downloaded files
- `binaryPath`: Cached path to yt-dlp binary

## 🛠️ Tech Stack

- **Runtime**: [Node.js](https://nodejs.org) or [Bun](https://bun.sh)
- **CLI Framework**: [Commander.js](https://github.com/tj/commander.js)
- **Downloader**: [yt-dlp](https://github.com/yt-dlp/yt-dlp)
- **Audio Processing**: [FFmpeg](https://ffmpeg.org)
- **Styling**: [cfonts](https://github.com/dominikwilkowski/cfonts), [gradient-string](https://github.com/bokub/gradient-string), [picocolors](https://github.com/alexeyraspopov/picocolors)

## 📄 License

MIT - see [LICENSE](LICENSE) file for details
