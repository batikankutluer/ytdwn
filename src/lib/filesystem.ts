import { Effect } from "effect";
import {
  access,
  chmod,
  mkdir,
  readFile,
  writeFile,
  constants as fsConstants,
} from "fs/promises";
import {
  FileWriteError,
  DirectoryCreateError,
} from "./errors";

// ─────────────────────────────────────────────────────────────
// File Access
// ─────────────────────────────────────────────────────────────

/**
 * Checks if a file exists and is executable.
 */
export const isExecutable = (path: string): Effect.Effect<boolean> =>
  Effect.tryPromise({
    try: async () => {
      await access(path, fsConstants.X_OK);
      return true;
    },
    catch: () => false,
  }).pipe(Effect.orElseSucceed(() => false));

// ─────────────────────────────────────────────────────────────
// Read Operations
// ─────────────────────────────────────────────────────────────

/**
 * Reads and parses a JSON file, returning default if it fails.
 */
export const readJsonFileOrDefault = <T>(
  path: string,
  defaultValue: T
): Effect.Effect<T> =>
  Effect.tryPromise({
    try: async () => JSON.parse(await readFile(path, "utf-8")) as T,
    catch: () => defaultValue,
  }).pipe(Effect.orElseSucceed(() => defaultValue));

// ─────────────────────────────────────────────────────────────
// Write Operations
// ─────────────────────────────────────────────────────────────

/**
 * Writes an object as JSON to a file.
 */
export const writeJsonFile = <T>(
  path: string,
  data: T
): Effect.Effect<void, FileWriteError> =>
  Effect.tryPromise({
    try: () => writeFile(path, JSON.stringify(data, null, 2), "utf-8"),
    catch: (cause) => new FileWriteError({ path, cause }),
  });

/**
 * Writes binary data to a file.
 */
export const writeFileBinary = (
  path: string,
  data: Buffer
): Effect.Effect<void, FileWriteError> =>
  Effect.tryPromise({
    try: () => writeFile(path, data),
    catch: (cause) => new FileWriteError({ path, cause }),
  });

// ─────────────────────────────────────────────────────────────
// Directory Operations
// ─────────────────────────────────────────────────────────────

/**
 * Ensures a directory exists, creating it if necessary.
 * Returns the path for chaining.
 */
export const ensureDirectory = (
  path: string
): Effect.Effect<string, DirectoryCreateError> =>
  Effect.tryPromise({
    try: () => mkdir(path, { recursive: true }),
    catch: (cause) => new DirectoryCreateError({ path, cause }),
  }).pipe(Effect.as(path));

// ─────────────────────────────────────────────────────────────
// Permissions
// ─────────────────────────────────────────────────────────────

/**
 * Makes a file executable (chmod +x).
 */
export const makeExecutable = (
  path: string
): Effect.Effect<void, FileWriteError> =>
  Effect.tryPromise({
    try: () => chmod(path, 0o755),
    catch: (cause) => new FileWriteError({ path, cause }),
  });
