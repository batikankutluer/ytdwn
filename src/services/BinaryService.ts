import { Effect, Context, Layer } from "effect";
import YTDlpWrapModule from "yt-dlp-wrap";
import { platform } from "os";
import { join } from "path";

// Handle ESM/CJS interop
const YTDlpWrap = (YTDlpWrapModule as unknown as { default?: typeof YTDlpWrapModule }).default ?? YTDlpWrapModule;

import { BIN_DIR } from "../config";
import { isExecutable, ensureDirectory, makeExecutable, writeFileBinary } from "../lib/filesystem";
import { fetchBinaryWithRetry } from "../lib/http";
import {
  BinaryNotFoundError,
  BinaryDownloadError,
  type DownloadError,
  type FileWriteError,
  type DirectoryCreateError,
} from "../lib/errors";
import { SettingsService } from "./SettingsService";

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

const getCandidateNames = (): string[] => {
  const platformNames = BINARY_NAMES[process.platform];
  if (!platformNames) return [FALLBACK_BINARY];
  if (Array.isArray(platformNames)) return platformNames;
  const archNames = platformNames[process.arch as Arch];
  return archNames ?? [FALLBACK_BINARY];
};

const getCandidatePaths = (): string[] =>
  getCandidateNames().map((name) => join(BIN_DIR, name));

// ─────────────────────────────────────────────────────────────
// Asset Selection
// ─────────────────────────────────────────────────────────────

const pickAsset = (release: Release): Effect.Effect<ReleaseAsset, BinaryDownloadError> => {
  const assets = release.assets ?? [];
  const candidates = getCandidateNames();

  const match =
    assets.find((a) => candidates.includes(a.name)) ??
    assets.find((a) => a.name === FALLBACK_BINARY);

  if (!match) {
    return Effect.fail(
      new BinaryDownloadError({
        platform: `${process.platform}-${process.arch}`,
        cause: "No suitable binary found for this platform",
      })
    );
  }

  return Effect.succeed(match);
};

// ─────────────────────────────────────────────────────────────
// Service Definition
// ─────────────────────────────────────────────────────────────

export class BinaryService extends Context.Tag("BinaryService")<
  BinaryService,
  {
    readonly findBinary: Effect.Effect<string | null>;
    readonly requireBinary: Effect.Effect<string, BinaryNotFoundError>;
    readonly getYtDlpWrap: Effect.Effect<InstanceType<typeof YTDlpWrap>, BinaryNotFoundError>;
    readonly downloadLatestBinary: Effect.Effect<
      string,
      BinaryDownloadError | DownloadError | FileWriteError | DirectoryCreateError
    >;
  }
>() {}

// ─────────────────────────────────────────────────────────────
// Live Implementation
// ─────────────────────────────────────────────────────────────

export const BinaryServiceLive = Layer.effect(
  BinaryService,
  Effect.gen(function* () {
    const settings = yield* SettingsService;

    const searchForBinary = Effect.gen(function* () {
      for (const candidate of getCandidatePaths()) {
        const executable = yield* isExecutable(candidate);
        if (executable) {
          yield* settings.setCachedBinaryPath(candidate).pipe(Effect.ignore);
          return candidate;
        }
      }
      return null;
    });

    const findBinary = Effect.gen(function* () {
      // Check cache first
      const cached = yield* settings.getCachedBinaryPath;
      if (cached) {
        const executable = yield* isExecutable(cached);
        if (executable) return cached;
      }

      // Cache miss or invalid - search file system
      const found = yield* searchForBinary;
      if (found) return found;

      // Clear invalid cache (non-critical, ignore errors)
      if (cached) {
        yield* settings.clearCachedBinaryPath.pipe(Effect.ignore);
      }
      return null;
    });

    const requireBinary = Effect.gen(function* () {
      const existing = yield* findBinary;
      if (existing) return existing;

      return yield* Effect.fail(
        new BinaryNotFoundError({
          message: "yt-dlp binary not found. Run 'ytdwn prepare' first.",
        })
      );
    });

    // Get a configured YTDlpWrap instance
    const getYtDlpWrap = Effect.gen(function* () {
      const binaryPath = yield* requireBinary;
      return new YTDlpWrap(binaryPath);
    });

    const downloadLatestBinary = Effect.gen(function* () {
      // Use yt-dlp-wrap to get latest release info
      const releases = yield* Effect.tryPromise({
        try: () => YTDlpWrap.getGithubReleases(1, 1),
        catch: (cause) =>
          new BinaryDownloadError({
            platform: `${process.platform}-${process.arch}`,
            cause,
          }),
      });

      const release = Array.isArray(releases) ? releases[0] : releases;
      if (!release) {
        return yield* Effect.fail(
          new BinaryDownloadError({
            platform: `${process.platform}-${process.arch}`,
            cause: "No releases found",
          })
        );
      }

      const asset = yield* pickAsset(release as Release);
      const binaryPath = join(BIN_DIR, asset.name);

      // Check if already exists
      const exists = yield* isExecutable(binaryPath);
      if (exists) {
        yield* settings.setCachedBinaryPath(binaryPath).pipe(Effect.ignore);
        return binaryPath;
      }

      // Ensure bin directory exists
      yield* ensureDirectory(BIN_DIR);

      // Download binary
      const data = yield* fetchBinaryWithRetry(asset.browser_download_url);
      yield* writeFileBinary(binaryPath, data);

      // Make executable on non-Windows
      if (platform() !== "win32") {
        yield* makeExecutable(binaryPath);
      }

      yield* settings.setCachedBinaryPath(binaryPath).pipe(Effect.ignore);
      return binaryPath;
    });

    return {
      findBinary,
      requireBinary,
      getYtDlpWrap,
      downloadLatestBinary,
    };
  })
);
