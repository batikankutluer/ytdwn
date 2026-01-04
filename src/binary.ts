import { constants as fsConstants } from "fs";
import { access, chmod, mkdir, writeFile } from "fs/promises";
import { platform, arch } from "os";
import { join, dirname } from "path";
import { BIN_DIR } from "./config";
import {
  getCachedBinaryPath,
  setCachedBinaryPath,
  clearCachedBinaryPath,
} from "./settings";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface ReleaseAsset {
  name: string;
  browser_download_url: string;
}

interface Release {
  assets?: ReleaseAsset[];
}

type Platform = NodeJS.Platform;
type Arch = NodeJS.Architecture;

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const BINARY_NAMES: Record<Platform, Record<Arch, string[]> | string[]> = {
  win32: ["yt-dlp.exe"],
  darwin: {
    arm64: ["yt-dlp_macos_arm64", "yt-dlp_macos_aarch64", "yt-dlp_macos"],
    x64: ["yt-dlp_macos"],
  } as Record<Arch, string[]>,
  linux: {
    arm64: ["yt-dlp_linux_arm64", "yt-dlp_linux_aarch64", "yt-dlp"],
    x64: ["yt-dlp_linux", "yt-dlp"],
  } as Record<Arch, string[]>,
} as Record<Platform, Record<Arch, string[]> | string[]>;

const FALLBACK_BINARY = "yt-dlp";

// ─────────────────────────────────────────────────────────────
// Platform Detection
// ─────────────────────────────────────────────────────────────

function getCandidateNames(): string[] {
  const platformNames = BINARY_NAMES[process.platform];

  if (!platformNames) return [FALLBACK_BINARY];

  if (Array.isArray(platformNames)) return platformNames;

  const archNames = platformNames[process.arch as Arch];
  return archNames ?? [FALLBACK_BINARY];
}

function getCandidatePaths(): string[] {
  return getCandidateNames().map((name) => join(BIN_DIR, name));
}

// ─────────────────────────────────────────────────────────────
// File Operations
// ─────────────────────────────────────────────────────────────

async function isExecutable(filePath: string): Promise<boolean> {
  try {
    await access(filePath, fsConstants.X_OK);
    return true;
  } catch {
    return false;
  }
}

async function downloadFile(url: string, targetPath: string): Promise<void> {
  await mkdir(dirname(targetPath), { recursive: true });

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `Download failed: ${response.status} ${response.statusText}`
    );
  }

  await writeFile(targetPath, Buffer.from(await response.arrayBuffer()));

  if (platform() !== "win32") {
    await chmod(targetPath, 0o755);
  }
}

// ─────────────────────────────────────────────────────────────
// Asset Selection
// ─────────────────────────────────────────────────────────────

function pickAsset(release: Release): ReleaseAsset {
  const assets = release.assets ?? [];
  const candidates = getCandidateNames();

  const match =
    assets.find((a) => candidates.includes(a.name)) ??
    assets.find((a) => a.name === FALLBACK_BINARY);

  if (!match) {
    throw new Error("Suitable yt-dlp binary not found for this platform.");
  }

  return match;
}

// ─────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────

/**
 * Finds an existing prepared binary. Uses cache for speed.
 */
export async function findBinary(): Promise<string | null> {
  // Check cache first
  const cached = await getCachedBinaryPath();
  if (cached && (await isExecutable(cached))) {
    return cached;
  }

  // Cache miss or invalid - search file system
  for (const candidate of getCandidatePaths()) {
    if (await isExecutable(candidate)) {
      // Update cache
      await setCachedBinaryPath(candidate);
      return candidate;
    }
  }

  // Clear invalid cache
  if (cached) await clearCachedBinaryPath();
  return null;
}

/**
 * Ensures a prepared binary exists, throws if not.
 */
export async function requireBinary(): Promise<string> {
  const existing = await findBinary();
  if (existing) return existing;

  throw new Error("yt-dlp binary not found. Run 'ytdwn prepare' first.");
}

/**
 * Downloads the latest yt-dlp binary from GitHub.
 */
export async function downloadLatestBinary(): Promise<string> {
  // Try to use yt-dlp-wrap first (works in CommonJS/development)
  // Fallback to direct GitHub API if it fails (ESM compatibility)
  let release: Release | null = null;

  try {
    // Dynamic import for ESM compatibility
    const ytDlpWrapModule = await import("yt-dlp-wrap");
    const YTDlpWrap = ytDlpWrapModule.default;

    if (typeof YTDlpWrap?.getGithubReleases === "function") {
      const releases = await YTDlpWrap.getGithubReleases(1, 1);
      release = Array.isArray(releases) ? releases[0] : releases;
    }
  } catch (err) {
    // Fall through to GitHub API
  }

  // Fallback to direct GitHub API if yt-dlp-wrap failed
  if (!release) {
    const response = await fetch(
      "https://api.github.com/repos/yt-dlp/yt-dlp/releases/latest"
    );

    if (!response.ok) {
      throw new Error(
        `Failed to fetch yt-dlp release: ${response.status} ${response.statusText}`
      );
    }

    release = (await response.json()) as Release;
  }

  if (!release) {
    throw new Error("Failed to fetch yt-dlp release from GitHub.");
  }

  const asset = pickAsset(release);
  const binaryPath = join(BIN_DIR, asset.name);

  if (await isExecutable(binaryPath)) {
    await setCachedBinaryPath(binaryPath);
    return binaryPath;
  }

  await downloadFile(asset.browser_download_url, binaryPath);
  await setCachedBinaryPath(binaryPath);
  return binaryPath;
}
