import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { Effect, Layer, Context } from "effect";
import { mkdtemp, rm, writeFile, readFile } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { readJsonFileOrDefault, writeJsonFile } from "../src/lib/filesystem";

// We test the underlying filesystem operations that SettingsService uses,
// since the service itself loads settings path at module time.

interface Settings {
  downloadDir?: string;
  binaryPath?: string | null;
}

describe("Settings (filesystem operations)", () => {
  let tempDir: string;
  let settingsPath: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "ytdwn-settings-test-"));
    settingsPath = join(tempDir, ".ytdwn.json");
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe("readJsonFileOrDefault", () => {
    test("returns default when settings file doesn't exist", async () => {
      const defaultSettings: Settings = {};
      const result = await Effect.runPromise(
        readJsonFileOrDefault<Settings>(settingsPath, defaultSettings)
      );

      expect(result).toEqual({});
    });

    test("reads existing settings file", async () => {
      const settings: Settings = { downloadDir: "/custom/path" };
      await writeFile(settingsPath, JSON.stringify(settings));

      const result = await Effect.runPromise(
        readJsonFileOrDefault<Settings>(settingsPath, {})
      );

      expect(result.downloadDir).toBe("/custom/path");
    });

    test("preserves binaryPath in settings", async () => {
      const settings: Settings = { binaryPath: "/path/to/yt-dlp" };
      await writeFile(settingsPath, JSON.stringify(settings));

      const result = await Effect.runPromise(
        readJsonFileOrDefault<Settings>(settingsPath, {})
      );

      expect(result.binaryPath).toBe("/path/to/yt-dlp");
    });
  });

  describe("writeJsonFile", () => {
    test("writes settings to file", async () => {
      const settings: Settings = {
        downloadDir: "/new/path",
        binaryPath: "/usr/bin/yt-dlp",
      };

      await Effect.runPromise(writeJsonFile(settingsPath, settings));

      const content = await readFile(settingsPath, "utf-8");
      const parsed = JSON.parse(content) as Settings;

      expect(parsed.downloadDir).toBe("/new/path");
      expect(parsed.binaryPath).toBe("/usr/bin/yt-dlp");
    });

    test("updates existing settings", async () => {
      // Write initial settings
      await Effect.runPromise(
        writeJsonFile(settingsPath, { downloadDir: "/initial" })
      );

      // Read, modify, and write back
      const current = await Effect.runPromise(
        readJsonFileOrDefault<Settings>(settingsPath, {})
      );
      const updated = { ...current, downloadDir: "/updated" };
      await Effect.runPromise(writeJsonFile(settingsPath, updated));

      // Verify
      const result = await Effect.runPromise(
        readJsonFileOrDefault<Settings>(settingsPath, {})
      );
      expect(result.downloadDir).toBe("/updated");
    });

    test("can clear binaryPath by setting to null", async () => {
      // Set initial path
      await Effect.runPromise(
        writeJsonFile(settingsPath, { binaryPath: "/some/path" })
      );

      // Clear it
      await Effect.runPromise(
        writeJsonFile(settingsPath, { binaryPath: null })
      );

      // Verify
      const result = await Effect.runPromise(
        readJsonFileOrDefault<Settings>(settingsPath, {})
      );
      expect(result.binaryPath).toBeNull();
    });
  });

  describe("settings workflow", () => {
    test("full settings workflow: create, update, read", async () => {
      const defaultSettings: Settings = {};

      // Initially empty
      let settings = await Effect.runPromise(
        readJsonFileOrDefault<Settings>(settingsPath, defaultSettings)
      );
      expect(settings).toEqual({});

      // Set download dir
      await Effect.runPromise(
        writeJsonFile(settingsPath, { downloadDir: "/downloads" })
      );

      // Read back
      settings = await Effect.runPromise(
        readJsonFileOrDefault<Settings>(settingsPath, defaultSettings)
      );
      expect(settings.downloadDir).toBe("/downloads");

      // Add binary path
      await Effect.runPromise(
        writeJsonFile(settingsPath, {
          ...settings,
          binaryPath: "/bin/yt-dlp",
        })
      );

      // Read both
      settings = await Effect.runPromise(
        readJsonFileOrDefault<Settings>(settingsPath, defaultSettings)
      );
      expect(settings.downloadDir).toBe("/downloads");
      expect(settings.binaryPath).toBe("/bin/yt-dlp");
    });
  });
});
