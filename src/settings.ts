import { readFile, writeFile } from "fs/promises";
import { homedir } from "os";
import { join, resolve } from "path";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface Settings {
  downloadDir?: string;
  binaryPath?: string;
}

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const SETTINGS_PATH = join(homedir(), ".ytdwn.json");

// ─────────────────────────────────────────────────────────────
// Internal
// ─────────────────────────────────────────────────────────────

async function load(): Promise<Settings> {
  try {
    return JSON.parse(await readFile(SETTINGS_PATH, "utf-8"));
  } catch {
    return {};
  }
}

const save = (settings: Settings) =>
  writeFile(SETTINGS_PATH, JSON.stringify(settings, null, 2));

// ─────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────

/**
 * Gets the download directory. Falls back to current directory if not set.
 */
export async function getDownloadDir(): Promise<string> {
  const { downloadDir } = await load();
  return downloadDir ?? process.cwd();
}

/**
 * Sets the download directory.
 */
export async function setDownloadDir(dir: string): Promise<void> {
  const settings = await load();
  await save({ ...settings, downloadDir: resolve(dir) });
}

/**
 * Resets the download directory to default (current directory).
 */
export async function resetDownloadDir(): Promise<void> {
  const { downloadDir, ...rest } = await load();
  await save(rest);
}

/**
 * Gets the cached binary path.
 */
export async function getCachedBinaryPath(): Promise<string | null> {
  const { binaryPath } = await load();
  return binaryPath ?? null;
}

/**
 * Sets the cached binary path.
 */
export async function setCachedBinaryPath(path: string): Promise<void> {
  const settings = await load();
  await save({ ...settings, binaryPath: path });
}

/**
 * Clears the cached binary path.
 */
export async function clearCachedBinaryPath(): Promise<void> {
  const { binaryPath, ...rest } = await load();
  await save(rest);
}
