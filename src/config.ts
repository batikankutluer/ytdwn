import { join } from "path";

// ─────────────────────────────────────────────────────────────
// App Info (change these to customize)
// ─────────────────────────────────────────────────────────────

export const APP_NAME = "ytdwn";
export const APP_TAGLINE = "YouTube to MP3 • Fast & Simple";
export const APP_VERSION = "1.0.0";

// ─────────────────────────────────────────────────────────────
// Audio Configuration
// ─────────────────────────────────────────────────────────────

export const DEFAULT_FORMAT = "mp3";
export const DEFAULT_AUDIO_QUALITY = "0"; // yt-dlp highest VBR quality
export const CONCURRENT_FRAGMENTS = "8"; // Parallel download fragments

// ─────────────────────────────────────────────────────────────
// Paths
// ─────────────────────────────────────────────────────────────

export const BIN_DIR = join(process.cwd(), "bin");

// ─────────────────────────────────────────────────────────────
// Templates
// ─────────────────────────────────────────────────────────────

export const getOutputTemplate = (downloadDir: string) =>
  join(downloadDir, "%(title)s.%(ext)s");
