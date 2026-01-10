import { describe, test, expect } from "bun:test";
import {
  APP_NAME,
  APP_VERSION,
  DEFAULT_FORMAT,
  DEFAULT_AUDIO_QUALITY,
  CONCURRENT_FRAGMENTS,
  BIN_DIR,
  getOutputTemplate,
} from "../src/config";

describe("config", () => {
  describe("constants", () => {
    test("APP_NAME is defined", () => {
      expect(APP_NAME).toBe("ytdwn");
    });

    test("APP_VERSION follows semver", () => {
      expect(APP_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
    });

    test("DEFAULT_FORMAT is mp3", () => {
      expect(DEFAULT_FORMAT).toBe("mp3");
    });

    test("DEFAULT_AUDIO_QUALITY is valid", () => {
      expect(DEFAULT_AUDIO_QUALITY).toBe("0");
    });

    test("CONCURRENT_FRAGMENTS is a string number", () => {
      expect(CONCURRENT_FRAGMENTS).toMatch(/^\d+$/);
    });

    test("BIN_DIR is defined", () => {
      expect(BIN_DIR).toBeDefined();
      expect(typeof BIN_DIR).toBe("string");
    });
  });

  describe("getOutputTemplate", () => {
    test("returns template with directory", () => {
      const template = getOutputTemplate("/home/user/downloads");
      expect(template).toContain("/home/user/downloads");
      expect(template).toContain("%(title)s");
      expect(template).toContain("%(ext)s");
    });

    test("handles trailing slash", () => {
      const template = getOutputTemplate("/home/user/downloads/");
      expect(template).toContain("/home/user/downloads/");
    });
  });
});
