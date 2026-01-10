import { describe, test, expect } from "bun:test";
import { formatError } from "../src/cli/errors";
import {
  BinaryNotFoundError,
  VideoNotFoundError,
  InvalidUrlError,
  AgeRestrictedError,
  ConnectionError,
  BinaryExecutionError,
  FileWriteError,
  DirectoryCreateError,
} from "../src/lib/errors";

describe("CLI errors", () => {
  describe("formatError", () => {
    test("formats BinaryNotFoundError", () => {
      const error = new BinaryNotFoundError({
        message: "yt-dlp not found",
      });
      expect(formatError(error)).toBe("yt-dlp not found");
    });

    test("formats VideoNotFoundError", () => {
      const error = new VideoNotFoundError({
        url: "https://youtube.com/watch?v=test",
      });
      expect(formatError(error)).toBe("Video not found or private");
    });

    test("formats InvalidUrlError", () => {
      const error = new InvalidUrlError({ url: "invalid" });
      expect(formatError(error)).toBe("Invalid URL format");
    });

    test("formats AgeRestrictedError", () => {
      const error = new AgeRestrictedError({
        url: "https://youtube.com/watch?v=test",
      });
      expect(formatError(error)).toBe("Age-restricted video (login required)");
    });

    test("formats ConnectionError", () => {
      const error = new ConnectionError({
        message: "Network timeout",
      });
      expect(formatError(error)).toBe("Network timeout");
    });

    test("formats BinaryExecutionError", () => {
      const error = new BinaryExecutionError({
        exitCode: 1,
        message: "Process failed",
      });
      expect(formatError(error)).toBe("Process failed");
    });

    test("formats FileWriteError", () => {
      const error = new FileWriteError({ path: "/test/file" });
      expect(formatError(error)).toBe("Failed to write file");
    });

    test("formats DirectoryCreateError", () => {
      const error = new DirectoryCreateError({ path: "/test/dir" });
      expect(formatError(error)).toBe("Failed to create directory");
    });

    test("formats regular Error", () => {
      const error = new Error("Regular error message");
      expect(formatError(error)).toBe("Regular error message");
    });

    test("formats string error", () => {
      expect(formatError("string error")).toBe("string error");
    });

    test("formats null/undefined", () => {
      expect(formatError(null)).toBe("null");
      expect(formatError(undefined)).toBe("undefined");
    });
  });
});
