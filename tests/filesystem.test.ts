import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { Effect } from "effect";
import { mkdtemp, rm, writeFile, readFile } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import {
  isExecutable,
  readJsonFileOrDefault,
  writeJsonFile,
  ensureDirectory,
} from "../src/lib/filesystem";

describe("filesystem", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "ytdwn-test-"));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe("isExecutable", () => {
    test("returns false for non-existent file", async () => {
      const result = await Effect.runPromise(
        isExecutable(join(tempDir, "nonexistent"))
      );
      expect(result).toBe(false);
    });

    test("returns false for non-executable file", async () => {
      const filePath = join(tempDir, "test.txt");
      await writeFile(filePath, "test content");

      const result = await Effect.runPromise(isExecutable(filePath));
      expect(result).toBe(false);
    });
  });

  describe("readJsonFileOrDefault", () => {
    test("returns default for non-existent file", async () => {
      const defaultValue = { key: "default" };
      const result = await Effect.runPromise(
        readJsonFileOrDefault(join(tempDir, "nonexistent.json"), defaultValue)
      );
      expect(result).toEqual(defaultValue);
    });

    test("reads existing JSON file", async () => {
      const filePath = join(tempDir, "test.json");
      const data = { name: "test", value: 123 };
      await writeFile(filePath, JSON.stringify(data));

      const result = await Effect.runPromise(
        readJsonFileOrDefault(filePath, {})
      );
      expect(result).toEqual(data);
    });

    test("returns default for invalid JSON", async () => {
      const filePath = join(tempDir, "invalid.json");
      await writeFile(filePath, "not valid json");

      const defaultValue = { fallback: true };
      const result = await Effect.runPromise(
        readJsonFileOrDefault(filePath, defaultValue)
      );
      expect(result).toEqual(defaultValue);
    });
  });

  describe("writeJsonFile", () => {
    test("writes JSON to file", async () => {
      const filePath = join(tempDir, "output.json");
      const data = { name: "test", values: [1, 2, 3] };

      await Effect.runPromise(writeJsonFile(filePath, data));

      const content = await readFile(filePath, "utf-8");
      expect(JSON.parse(content)).toEqual(data);
    });
  });

  describe("ensureDirectory", () => {
    test("creates directory if not exists", async () => {
      const dirPath = join(tempDir, "new", "nested", "dir");

      const result = await Effect.runPromise(ensureDirectory(dirPath));

      expect(result).toBe(dirPath);
    });

    test("succeeds if directory already exists", async () => {
      const result = await Effect.runPromise(ensureDirectory(tempDir));
      expect(result).toBe(tempDir);
    });
  });
});
