import { join } from "path";

// ─────────────────────────────────────────────────────────────
// App Info
// ─────────────────────────────────────────────────────────────

export const APP_NAME = "ytdwn";
export const APP_TAGLINE = "YouTube to MP3/MP4 • Fast & Simple";
export const APP_VERSION = "1.1.1";

// ─────────────────────────────────────────────────────────────
// Audio Configuration
// ─────────────────────────────────────────────────────────────

export const DEFAULT_AUDIO_FORMAT = "mp3";
export const DEFAULT_AUDIO_QUALITY = "0"; // yt-dlp highest VBR quality

// ─────────────────────────────────────────────────────────────
// Video Configuration
// ─────────────────────────────────────────────────────────────

export const DEFAULT_VIDEO_FORMAT = "mp4";
export const DEFAULT_VIDEO_QUALITY = "best"; // Best available quality

// ─────────────────────────────────────────────────────────────
// Download Configuration
// ─────────────────────────────────────────────────────────────

export const CONCURRENT_FRAGMENTS = "8";

// Legacy export for backward compatibility
export const DEFAULT_FORMAT = DEFAULT_AUDIO_FORMAT;

// ─────────────────────────────────────────────────────────────
// Paths
// ─────────────────────────────────────────────────────────────

export const BIN_DIR = join(process.cwd(), "bin");

// ─────────────────────────────────────────────────────────────
// Templates
// ─────────────────────────────────────────────────────────────

export const getOutputTemplate = (downloadDir: string) =>
  join(downloadDir, "%(title)s.%(ext)s");
