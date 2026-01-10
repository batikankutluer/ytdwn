# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-01-11

### Added

- **MP4 video download support** - Use `-f mp4` to download video instead of audio
- Support for multiple video formats (mp4, mkv, webm, avi, mov)
- Comprehensive test suite (54 unit tests)
- Effect.TS integration for type-safe error handling
- yt-dlp-wrap integration for simpler binary management

### Changed

- Refactored codebase to use functional Effect.TS patterns
- Simplified service architecture with dependency injection
- Updated tagline to "YouTube to MP3/MP4 • Fast & Simple"

### Removed

- Removed `@ffmpeg-installer/ffmpeg` dependency (uses system ffmpeg)

## [1.0.0] - 2026-01-04

### Added

- Initial release
- Download audio from YouTube videos in MP3 format
- Support for multiple audio formats (mp3, opus, m4a, etc.)
- Clip specific sections of videos with `-c` flag
- Set default download folder with `setDefaultFolder` command
- Beautiful ASCII banner with gradient colors
- Progress bar with download speed indicator
- Auto-download yt-dlp binary with `prepare` command
- Quiet mode for scripting with `-q` flag
- Cross-platform support (macOS, Linux, Windows)
