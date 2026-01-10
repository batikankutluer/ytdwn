import { Effect, Schedule } from "effect";
import { DownloadError } from "./errors";

// ─────────────────────────────────────────────────────────────
// HTTP Operations
// ─────────────────────────────────────────────────────────────

/**
 * Fetches binary data from a URL with automatic retry.
 */
export const fetchBinaryWithRetry = (
  url: string,
  maxRetries = 2
): Effect.Effect<Buffer, DownloadError> =>
  Effect.tryPromise({
    try: async () => {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return Buffer.from(await response.arrayBuffer());
    },
    catch: (cause) => new DownloadError({ url, cause }),
  }).pipe(
    Effect.retry(
      Schedule.recurs(maxRetries).pipe(Schedule.addDelay(() => "1 second"))
    )
  );
