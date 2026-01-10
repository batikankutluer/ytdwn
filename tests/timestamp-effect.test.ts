import { describe, test, expect } from "bun:test";
import { Effect } from "effect";
import {
  parseTimestampEffect,
  parseClipRangeEffect,
} from "../src/timestamp";
import { TimestampParseError } from "../src/lib/errors";

describe("timestamp Effect API", () => {
  describe("parseTimestampEffect", () => {
    test("parses valid MM:SS format", async () => {
      const result = await Effect.runPromise(parseTimestampEffect("1:30"));
      expect(result).toBe("00:01:30");
    });

    test("parses valid HH:MM:SS format", async () => {
      const result = await Effect.runPromise(parseTimestampEffect("1:30:45"));
      expect(result).toBe("01:30:45");
    });

    test("fails with TimestampParseError for invalid input", async () => {
      const effect = parseTimestampEffect("invalid");

      const result = await Effect.runPromise(
        effect.pipe(
          Effect.catchTag("TimestampParseError", (e) =>
            Effect.succeed(`caught: ${e._tag}`)
          )
        )
      );

      expect(result).toBe("caught: TimestampParseError");
    });

    test("error contains input and message", async () => {
      const effect = parseTimestampEffect("bad");

      let caughtError: TimestampParseError | null = null;
      await Effect.runPromise(
        effect.pipe(
          Effect.catchTag("TimestampParseError", (e) => {
            caughtError = e;
            return Effect.succeed(null);
          })
        )
      );

      expect(caughtError).not.toBeNull();
      expect(caughtError!.input).toBe("bad");
      expect(caughtError!.message).toContain("Invalid time format");
    });
  });

  describe("parseClipRangeEffect", () => {
    test("parses valid clip range", async () => {
      const result = await Effect.runPromise(
        parseClipRangeEffect("1:30-2:45")
      );
      expect(result).toBe("00:01:30-00:02:45");
    });

    test("fails with TimestampParseError for invalid range", async () => {
      const effect = parseClipRangeEffect("invalid");

      const result = await Effect.runPromise(
        effect.pipe(
          Effect.catchTag("TimestampParseError", (e) =>
            Effect.succeed(`caught: ${e._tag}`)
          )
        )
      );

      expect(result).toBe("caught: TimestampParseError");
    });

    test("fails when missing end time", async () => {
      const effect = parseClipRangeEffect("1:30-");

      const result = await Effect.runPromise(
        effect.pipe(
          Effect.catchTag("TimestampParseError", () =>
            Effect.succeed("caught error")
          )
        )
      );

      expect(result).toBe("caught error");
    });
  });
});
