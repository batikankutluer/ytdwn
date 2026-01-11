import { Effect, Match, Console, pipe, Layer } from "effect";
import {
  BinaryNotFoundError,
  VideoNotFoundError,
  InvalidUrlError,
  AgeRestrictedError,
  ConnectionError,
  BinaryExecutionError,
  BinaryDownloadError,
  DownloadError,
  NetworkError,
  FileWriteError,
  DirectoryCreateError,
} from "../lib/errors";
import { c } from "../colors";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export type AppError =
  | BinaryNotFoundError
  | VideoNotFoundError
  | InvalidUrlError
  | AgeRestrictedError
  | ConnectionError
  | BinaryExecutionError
  | BinaryDownloadError
  | DownloadError
  | NetworkError
  | FileWriteError
  | DirectoryCreateError;

// ─────────────────────────────────────────────────────────────
// Error Formatting
// ─────────────────────────────────────────────────────────────

const formatAppError = (error: AppError): string =>
  Match.value(error).pipe(
    Match.tag("BinaryNotFoundError", (e) => e.message),
    Match.tag("VideoNotFoundError", () => "Video not found or private"),
    Match.tag("InvalidUrlError", () => "Invalid URL format"),
    Match.tag("AgeRestrictedError", () => "Age-restricted video (login required)"),
    Match.tag("ConnectionError", (e) => e.message),
    Match.tag("BinaryExecutionError", (e) => e.message),
    Match.tag("BinaryDownloadError", () => "Failed to download yt-dlp binary"),
    Match.tag("DownloadError", (e) => `Download failed: ${e.url}`),
    Match.tag("NetworkError", (e) => e.message),
    Match.tag("FileWriteError", () => "Failed to write file"),
    Match.tag("DirectoryCreateError", () => "Failed to create directory"),
    Match.exhaustive
  );

const isAppError = (error: unknown): error is AppError =>
  error !== null &&
  typeof error === "object" &&
  "_tag" in error &&
  typeof (error as { _tag: unknown })._tag === "string";

export const formatError = (error: unknown): string => {
  if (isAppError(error)) return formatAppError(error);
  if (error instanceof Error) return error.message;
  return String(error);
};

// ─────────────────────────────────────────────────────────────
// Effect-based Error Handling
// ─────────────────────────────────────────────────────────────

const withErrorHandler = <A, E, R>(
  effect: Effect.Effect<A, E, R>
): Effect.Effect<A, never, R> =>
  pipe(
    effect,
    Effect.catchAll((error) =>
      pipe(
        Console.error(`${c.sym.error} ${c.error("Error:")} ${formatError(error)}`),
        Effect.flatMap(() => Effect.sync(() => process.exit(1)))
      )
    )
  );

/**
 * Runs an effect with error handling. Main entry point for CLI commands.
 */
export const runCommand = <A, E, R>(
  effect: Effect.Effect<A, E, R>,
  layer: Layer.Layer<R>
): Promise<A> =>
  Effect.runPromise(
    pipe(effect, Effect.provide(layer), withErrorHandler)
  );
