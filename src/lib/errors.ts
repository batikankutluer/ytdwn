import { Data } from "effect";

// ─────────────────────────────────────────────────────────────
// File System Errors
// ─────────────────────────────────────────────────────────────

export class FileWriteError extends Data.TaggedError("FileWriteError")<{
  readonly path: string;
  readonly cause?: unknown;
}> {}

export class DirectoryCreateError extends Data.TaggedError(
  "DirectoryCreateError"
)<{
  readonly path: string;
  readonly cause?: unknown;
}> {}

// ─────────────────────────────────────────────────────────────
// Network Errors
// ─────────────────────────────────────────────────────────────

export class NetworkError extends Data.TaggedError("NetworkError")<{
  readonly url?: string;
  readonly message: string;
}> {}

export class DownloadError extends Data.TaggedError("DownloadError")<{
  readonly url: string;
  readonly cause?: unknown;
}> {}

// ─────────────────────────────────────────────────────────────
// Binary Errors
// ─────────────────────────────────────────────────────────────

export class BinaryNotFoundError extends Data.TaggedError(
  "BinaryNotFoundError"
)<{
  readonly message: string;
}> {}

export class BinaryDownloadError extends Data.TaggedError(
  "BinaryDownloadError"
)<{
  readonly platform: string;
  readonly cause?: unknown;
}> {}

export class BinaryExecutionError extends Data.TaggedError(
  "BinaryExecutionError"
)<{
  readonly exitCode: number;
  readonly message: string;
}> {}

// ─────────────────────────────────────────────────────────────
// Timestamp Errors
// ─────────────────────────────────────────────────────────────

export class TimestampParseError extends Data.TaggedError(
  "TimestampParseError"
)<{
  readonly input: string;
  readonly message: string;
}> {}

// ─────────────────────────────────────────────────────────────
// Application Errors (high-level)
// ─────────────────────────────────────────────────────────────

export class VideoNotFoundError extends Data.TaggedError("VideoNotFoundError")<{
  readonly url: string;
}> {}

export class InvalidUrlError extends Data.TaggedError("InvalidUrlError")<{
  readonly url: string;
}> {}

export class AgeRestrictedError extends Data.TaggedError("AgeRestrictedError")<{
  readonly url: string;
}> {}

export class ConnectionError extends Data.TaggedError("ConnectionError")<{
  readonly message: string;
}> {}
