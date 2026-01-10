import { Effect } from "effect";
import { TimestampParseError } from "./lib/errors";

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const TIME_FORMAT_ERROR =
  "Invalid time format. Use MM:SS or HH:MM:SS (e.g. 0:02 or 01:23:45).";

const RANGE_FORMAT_ERROR =
  "Range must be in 'start-end' format (e.g. 0:02-23:10).";

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

const pad = (value: string) => value.padStart(2, "0");

function normalizeTimeParts(parts: string[]): [string, string, string] {
  if (parts.length === 2) {
    return ["0", parts[0] ?? "0", parts[1] ?? "0"];
  }
  return [parts[0] ?? "0", parts[1] ?? "0", parts[2] ?? "0"];
}

// ─────────────────────────────────────────────────────────────
// Effect-based API
// ─────────────────────────────────────────────────────────────

/**
 * Parses a raw timestamp string into HH:MM:SS format.
 * Accepts MM:SS or HH:MM:SS formats.
 * Returns an Effect that fails with TimestampParseError if invalid.
 */
export const parseTimestampEffect = (
  raw: string
): Effect.Effect<string, TimestampParseError> => {
  const parts = raw.split(":").map((p) => p.trim());

  if (parts.length < 2 || parts.length > 3) {
    return Effect.fail(
      new TimestampParseError({ input: raw, message: TIME_FORMAT_ERROR })
    );
  }

  const [h, m, s] = normalizeTimeParts(parts);
  return Effect.succeed(`${pad(h)}:${pad(m)}:${pad(s)}`);
};

/**
 * Parses a clip range string (start-end) into normalized format.
 * Returns an Effect that fails with TimestampParseError if invalid.
 */
export const parseClipRangeEffect = (
  range: string
): Effect.Effect<string, TimestampParseError> => {
  const parts = range.split("-").map((p) => p.trim());

  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return Effect.fail(
      new TimestampParseError({ input: range, message: RANGE_FORMAT_ERROR })
    );
  }

  return Effect.gen(function* () {
    const start = yield* parseTimestampEffect(parts[0]!);
    const end = yield* parseTimestampEffect(parts[1]!);
    return `${start}-${end}`;
  });
};

// ─────────────────────────────────────────────────────────────
// Legacy API (for backward compatibility)
// ─────────────────────────────────────────────────────────────

/**
 * Parses a raw timestamp string into HH:MM:SS format.
 * @throws Error if format is invalid
 * @deprecated Use parseTimestampEffect for type-safe error handling
 */
export function parseTimestamp(raw: string): string {
  const parts = raw.split(":").map((p) => p.trim());

  if (parts.length < 2 || parts.length > 3) {
    throw new Error(TIME_FORMAT_ERROR);
  }

  const [h, m, s] = normalizeTimeParts(parts);
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

/**
 * Parses a clip range string (start-end) into normalized format.
 * @throws Error if format is invalid
 * @deprecated Use parseClipRangeEffect for type-safe error handling
 */
export function parseClipRange(range: string): string {
  const parts = range.split("-").map((p) => p.trim());

  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new Error(RANGE_FORMAT_ERROR);
  }

  return `${parseTimestamp(parts[0])}-${parseTimestamp(parts[1])}`;
}
