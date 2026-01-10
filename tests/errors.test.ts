import { describe, test, expect } from "bun:test";
import { Effect } from "effect";
import {
  BinaryNotFoundError,
  VideoNotFoundError,
  FileWriteError,
  DirectoryCreateError,
  TimestampParseError,
} from "../src/lib/errors";

describe("errors", () => {
  describe("error creation", () => {
    test("BinaryNotFoundError has correct tag", () => {
      const error = new BinaryNotFoundError({ message: "test" });
      expect(error._tag).toBe("BinaryNotFoundError");
      expect(error.message).toBe("test");
    });

    test("VideoNotFoundError has correct tag", () => {
      const error = new VideoNotFoundError({ url: "https://example.com" });
      expect(error._tag).toBe("VideoNotFoundError");
      expect(error.url).toBe("https://example.com");
    });

    test("FileWriteError has correct tag", () => {
      const error = new FileWriteError({ path: "/test/path" });
      expect(error._tag).toBe("FileWriteError");
      expect(error.path).toBe("/test/path");
    });

    test("DirectoryCreateError has correct tag", () => {
      const error = new DirectoryCreateError({ path: "/test/dir" });
      expect(error._tag).toBe("DirectoryCreateError");
      expect(error.path).toBe("/test/dir");
    });

    test("TimestampParseError has correct tag", () => {
      const error = new TimestampParseError({
        input: "invalid",
        message: "bad format",
      });
      expect(error._tag).toBe("TimestampParseError");
      expect(error.input).toBe("invalid");
      expect(error.message).toBe("bad format");
    });
  });

  describe("error handling with Effect", () => {
    test("errors work with Effect.fail", async () => {
      const effect = Effect.fail(
        new BinaryNotFoundError({ message: "not found" })
      );

      const result = await Effect.runPromise(
        effect.pipe(
          Effect.catchTag("BinaryNotFoundError", (e) =>
            Effect.succeed(`caught: ${e.message}`)
          )
        )
      );

      expect(result).toBe("caught: not found");
    });
  });
});
