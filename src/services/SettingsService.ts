import { Effect, Context, Layer } from "effect";
import { homedir } from "os";
import { join, resolve } from "path";
import { readJsonFileOrDefault, writeJsonFile } from "../lib/filesystem";
import type { FileWriteError } from "../lib/errors";

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
// Service Definition
// ─────────────────────────────────────────────────────────────

export class SettingsService extends Context.Tag("SettingsService")<
  SettingsService,
  {
    readonly getDownloadDir: Effect.Effect<string>;
    readonly setDownloadDir: (dir: string) => Effect.Effect<void, FileWriteError>;
    readonly resetDownloadDir: Effect.Effect<void, FileWriteError>;
    readonly getCachedBinaryPath: Effect.Effect<string | null>;
    readonly setCachedBinaryPath: (
      path: string
    ) => Effect.Effect<void, FileWriteError>;
    readonly clearCachedBinaryPath: Effect.Effect<void, FileWriteError>;
  }
>() {}

// ─────────────────────────────────────────────────────────────
// Live Implementation
// ─────────────────────────────────────────────────────────────

const loadSettings = (): Effect.Effect<Settings> =>
  readJsonFileOrDefault<Settings>(SETTINGS_PATH, {});

const saveSettings = (settings: Settings): Effect.Effect<void, FileWriteError> =>
  writeJsonFile(SETTINGS_PATH, settings);

export const SettingsServiceLive = Layer.succeed(SettingsService, {
  getDownloadDir: Effect.gen(function* () {
    const { downloadDir } = yield* loadSettings();
    return downloadDir ?? process.cwd();
  }),

  setDownloadDir: (dir: string) =>
    Effect.gen(function* () {
      const settings = yield* loadSettings();
      yield* saveSettings({ ...settings, downloadDir: resolve(dir) });
    }),

  resetDownloadDir: Effect.gen(function* () {
    const settings = yield* loadSettings();
    const { downloadDir: _, ...rest } = settings;
    yield* saveSettings(rest);
  }),

  getCachedBinaryPath: Effect.gen(function* () {
    const { binaryPath } = yield* loadSettings();
    return binaryPath ?? null;
  }),

  setCachedBinaryPath: (path: string) =>
    Effect.gen(function* () {
      const settings = yield* loadSettings();
      yield* saveSettings({ ...settings, binaryPath: path });
    }),

  clearCachedBinaryPath: Effect.gen(function* () {
    const settings = yield* loadSettings();
    const { binaryPath: _, ...rest } = settings;
    yield* saveSettings(rest);
  }),
});
