import { describe, test, expect } from "bun:test";
import { parseTimestamp, parseClipRange } from "../src/timestamp";

describe("timestamp", () => {
  describe("parseTimestamp", () => {
    test("parses MM:SS format", () => {
      expect(parseTimestamp("1:30")).toBe("00:01:30");
      expect(parseTimestamp("0:05")).toBe("00:00:05");
      expect(parseTimestamp("59:59")).toBe("00:59:59");
    });

    test("parses HH:MM:SS format", () => {
      expect(parseTimestamp("1:30:45")).toBe("01:30:45");
      expect(parseTimestamp("0:0:5")).toBe("00:00:05");
      expect(parseTimestamp("12:34:56")).toBe("12:34:56");
    });

    test("pads single digit values", () => {
      expect(parseTimestamp("5:3")).toBe("00:05:03");
      expect(parseTimestamp("1:2:3")).toBe("01:02:03");
    });

    test("throws on invalid format", () => {
      expect(() => parseTimestamp("invalid")).toThrow();
      expect(() => parseTimestamp("1")).toThrow();
      expect(() => parseTimestamp("1:2:3:4")).toThrow();
    });
  });

  describe("parseClipRange", () => {
    test("parses start-end format", () => {
      expect(parseClipRange("1:30-2:45")).toBe("00:01:30-00:02:45");
      expect(parseClipRange("0:00-1:00")).toBe("00:00:00-00:01:00");
    });

    test("parses HH:MM:SS ranges", () => {
      expect(parseClipRange("1:00:00-1:30:00")).toBe("01:00:00-01:30:00");
    });

    test("throws on invalid range format", () => {
      expect(() => parseClipRange("1:30")).toThrow();
      expect(() => parseClipRange("1:30-")).toThrow();
      expect(() => parseClipRange("-2:45")).toThrow();
      expect(() => parseClipRange("invalid")).toThrow();
    });
  });
});
