import { Effect, pipe } from "effect";
import { BinaryService, DownloadService, SettingsService } from "../services";
import type { DownloadOptions } from "../services";
import { showBanner } from "../banner";
import { c } from "../colors";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export interface FolderOptions {
  readonly reset?: boolean;
}

// ─────────────────────────────────────────────────────────────
// Console Helpers (Effect-based)
// ─────────────────────────────────────────────────────────────

const log = (message: string) => Effect.sync(() => console.log(message));

const logSuccess = (message: string) =>
  log(`${c.sym.success} ${c.success(message)}`);

const logInfo = (message: string) => log(c.info(message));

const logDim = (message: string) => log(c.dim(message));

// ─────────────────────────────────────────────────────────────
// Commands
// ─────────────────────────────────────────────────────────────

/**
 * Prepare command: Downloads yt-dlp binary if not present.
 */
export const prepareCommand = Effect.gen(function* () {
  const binary = yield* BinaryService;

  const existing = yield* binary.findBinary;
  if (existing) {
    yield* logSuccess("Ready");
    return;
  }

  yield* logDim("Downloading yt-dlp...");
  yield* binary.downloadLatestBinary;
  yield* logSuccess("Ready");
});

/**
 * Set folder command: Manages default download directory.
 */
export const setFolderCommand = (path?: string, options?: FolderOptions) =>
  Effect.gen(function* () {
    const settings = yield* SettingsService;

    if (options?.reset) {
      yield* settings.resetDownloadDir;
      yield* logSuccess("Reset to current directory");
      return;
    }

    if (path) {
      yield* settings.setDownloadDir(path);
      yield* log(`${c.sym.success} ${c.info(path)}`);
    } else {
      const dir = yield* settings.getDownloadDir;
      yield* logInfo(dir);
    }
  });

/**
 * Download command: Downloads audio from YouTube URL.
 */
export const downloadCommand = (url: string, options: DownloadOptions) =>
  Effect.gen(function* () {
    const quiet = options.quiet ?? false;

    // Show banner at the start
    if (!quiet) {
      yield* Effect.sync(() => showBanner());
      yield* log(`${c.dim("URL:")} ${c.info(url)}\n`);
    }

    const download = yield* DownloadService;
    const result = yield* download.download(url, options);

    if (quiet) {
      yield* log(result.fileName);
    } else {
      yield* log("");
      yield* logSuccess("Process done!");
      yield* log("");
      const sizeInfo = result.fileSize ? ` ${c.size(`(${result.fileSize})`)}` : "";
      yield* log(`${c.file(result.fileName)}${sizeInfo}`);
    }
  });
