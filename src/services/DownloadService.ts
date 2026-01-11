import { Effect, Context, Layer } from "effect";
import type YTDlpWrap from "yt-dlp-wrap";
import {
  DEFAULT_AUDIO_QUALITY,
  CONCURRENT_FRAGMENTS,
  getOutputTemplate,
} from "../config";
import {
  BinaryExecutionError,
  VideoNotFoundError,
  InvalidUrlError,
  AgeRestrictedError,
  ConnectionError,
  type BinaryNotFoundError,
  type DirectoryCreateError,
} from "../lib/errors";
import { ensureDirectory } from "../lib/filesystem";
import { BinaryService } from "./BinaryService";
import { SettingsService } from "./SettingsService";
import { parseClipRange } from "../timestamp";
import { c } from "../colors";
import * as fs from "fs";
import * as path from "path";
import { spawn } from "child_process";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export interface DownloadOptions {
  format: string;
  clip?: string;
  quiet?: boolean;
}

export interface DownloadResult {
  filePath: string;
  fileName: string;
  fileSize?: string;
}

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const SPINNER_FRAMES = [
  "⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏",
] as const;
const SPINNER_INTERVAL_MS = 80;
const PROGRESS_BAR_WIDTH = 12;
const LINE_CLEAR_WIDTH = 60;

// ─────────────────────────────────────────────────────────────
// Console Utilities
// ─────────────────────────────────────────────────────────────

const write = (text: string) => process.stdout.write(text);
const clearLine = () => write(`\r${" ".repeat(LINE_CLEAR_WIDTH)}\r`);

function createSpinner(initialMessage = "Getting ready...", quiet = false) {
  let frame = 0;
  let message = initialMessage;
  let stopped = false;

  if (quiet) {
    return { update: () => { }, stop: () => { } };
  }

  const interval = setInterval(() => {
    if (!stopped) {
      const frameChar = SPINNER_FRAMES[frame++ % SPINNER_FRAMES.length] ?? "⠋";
      write(`\r${c.info(frameChar)} ${c.dim(message)}`);
    }
  }, SPINNER_INTERVAL_MS);

  return {
    update: (msg: string) => { message = msg; },
    stop: () => {
      if (stopped) return;
      stopped = true;
      clearInterval(interval);
      clearLine();
    },
  };
}

function renderProgress(percent: number, speed?: string, quiet = false) {
  if (quiet) return;

  const filled = Math.round((percent / 100) * PROGRESS_BAR_WIDTH);
  const bar =
    c.bar.filled("█".repeat(filled)) +
    c.bar.empty("░".repeat(PROGRESS_BAR_WIDTH - filled));

  const speedText = speed ? ` ${c.speed(speed)}` : "";
  write(
    `\r${c.bold("Downloading:")} ${bar} ${c.bar.percent(
      `${percent.toFixed(0)}%`
    )}${speedText}   `
  );
}

// ─────────────────────────────────────────────────────────────
// Error Mapping
// ─────────────────────────────────────────────────────────────

type DownloadPipelineError =
  | BinaryExecutionError
  | VideoNotFoundError
  | InvalidUrlError
  | AgeRestrictedError
  | ConnectionError;

function mapOutputToError(
  output: string,
  url: string
): DownloadPipelineError | null {
  const ageRestrictedPatterns = [
    /age[- ]?restrict/i,
    /age[- ]?gate/i,
    /sign in to confirm your age/i,
    /this video is age-restricted/i,
    /confirm your age/i,
  ];

  if (ageRestrictedPatterns.some((p) => p.test(output))) {
    return new AgeRestrictedError({ url });
  }

  if (/\b(network|connection)\s+(error|failed|refused)/i.test(output)) {
    return new ConnectionError({ message: "Connection error, try again" });
  }

  if (/video unavailable/i.test(output) || /private video/i.test(output)) {
    return new VideoNotFoundError({ url });
  }

  return null;
}

function mapExitCodeToError(
  code: number,
  url: string
): DownloadPipelineError {
  switch (code) {
    case 1:
      return new VideoNotFoundError({ url });
    case 2:
      return new InvalidUrlError({ url });
    default:
      return new BinaryExecutionError({
        exitCode: code,
        message: `Download failed with exit code ${code}`,
      });
  }
}

// ─────────────────────────────────────────────────────────────
// Command Builder
// ─────────────────────────────────────────────────────────────

const VIDEO_FORMATS = ["mp4", "mkv", "webm", "avi", "mov"] as const;

const isVideoFormat = (format: string): boolean =>
  VIDEO_FORMATS.includes(format.toLowerCase() as typeof VIDEO_FORMATS[number]);

function buildArgs(
  url: string,
  options: DownloadOptions,
  downloadDir: string,
  ffmpegPath: string | null
): string[] {
  const format = options.format.toLowerCase();
  const isVideo = isVideoFormat(format);

  // Common args for both audio and video
  const baseArgs = [
    url,
    "-o", getOutputTemplate(downloadDir),
    "--no-playlist",
    "--newline",
    "--progress",
    "--concurrent-fragments", CONCURRENT_FRAGMENTS,
    "--no-check-certificates",
    "--restrict-filenames",
  ];

  if (ffmpegPath) {
    baseArgs.push("--ffmpeg-location", ffmpegPath);
  }



  // Format-specific args
  const formatArgs = isVideo
    ? [
      "-f", "bestvideo+bestaudio/best",
      "--merge-output-format", format,
    ]
    : [
      "-f", "bestaudio/best",
      "-x",
      "--audio-format", format,
      "--audio-quality", DEFAULT_AUDIO_QUALITY,
      "--prefer-free-formats",
    ];

  // Clip args
  // NOTE: We download full video then cut manually for better speed
  const clipArgs: string[] = [];

  return [...baseArgs, ...formatArgs, ...clipArgs];
}

// ─────────────────────────────────────────────────────────────
// Service Definition
// ─────────────────────────────────────────────────────────────

export class DownloadService extends Context.Tag("DownloadService")<
  DownloadService,
  {
    readonly download: (
      url: string,
      options: DownloadOptions
    ) => Effect.Effect<
      DownloadResult,
      | BinaryNotFoundError
      | DirectoryCreateError
      | DownloadPipelineError
    >;
  }
>() { }

// ─────────────────────────────────────────────────────────────
// Live Implementation using yt-dlp-wrap
// ─────────────────────────────────────────────────────────────

interface DownloadState {
  phase: "init" | "downloading" | "converting";
  fileName: string | null;
  fileSize: string | null;
  outputBuffer: string;
  convertingInterval: ReturnType<typeof setInterval> | null;
}

function executeDownload(
  ytDlpWrap: YTDlpWrap,
  args: string[],
  downloadDir: string,
  url: string,
  options: DownloadOptions
): Effect.Effect<DownloadResult, DownloadPipelineError> {
  const quiet = options.quiet ?? false;
  return Effect.async<DownloadResult, DownloadPipelineError>((resume) => {
    const spinner = createSpinner("Getting ready...", quiet);
    const state: DownloadState = {
      phase: "init",
      fileName: null,
      fileSize: null,
      outputBuffer: "",
      convertingInterval: null,
    };

    const cleanup = () => {
      spinner.stop();
      if (state.convertingInterval) {
        clearInterval(state.convertingInterval);
      }
      if (!quiet) clearLine();
    };

    // Helper to parse HH:MM:SS or MM:SS to seconds
    const parseDurationSeconds = (timeStr: string): number => {
      const parts = timeStr.split(":").map(Number);
      if (parts.length === 3) return (parts[0] || 0) * 3600 + (parts[1] || 0) * 60 + (parts[2] || 0);
      if (parts.length === 2) return (parts[0] || 0) * 60 + (parts[1] || 0);
      return parts[0] || 0;
    };

    const parseSizeToBytes = (sizeStr: string): number => {
      const match = sizeStr.match(/([\d.]+)\s*([KMG]i?B)/i);
      if (!match || !match[1] || !match[2]) return 0;
      const val = parseFloat(match[1]);
      const unit = match[2].toUpperCase();
      const multipliers: Record<string, number> = {
        "KB": 1024, "KIB": 1024,
        "MB": 1024 * 1024, "MIB": 1024 * 1024,
        "GB": 1024 * 1024 * 1024, "GIB": 1024 * 1024 * 1024
      };
      return val * (multipliers[unit] || 1);
    };

    const formatSpeed = (bytesPerSec: number): string => {
      if (bytesPerSec > 1024 * 1024) return `${(bytesPerSec / (1024 * 1024)).toFixed(2)}MiB/s`;
      if (bytesPerSec > 1024) return `${(bytesPerSec / 1024).toFixed(2)}KiB/s`;
      return `${bytesPerSec.toFixed(0)}B/s`;
    };

    // Speed calculation state
    let lastBytes = 0;
    let lastTime = Date.now();
    let currentSpeedStr: string | undefined;

    // Calculate total duration if clip is present
    let totalClipDuration = 0;
    if (options.clip) {
      const parts = options.clip.split("-");
      if (parts.length === 2 && parts[0] && parts[1]) {
        const start = parseDurationSeconds(parts[0]);
        const end = parseDurationSeconds(parts[1]);
        totalClipDuration = end - start;
      }
    }

    // Use yt-dlp-wrap's EventEmitter interface
    const emitter = ytDlpWrap.exec(args);

    // Listen to raw stderr for ffmpeg progress (not caught by ytDlpEvent)
    if (emitter.ytDlpProcess?.stderr) {
      emitter.ytDlpProcess.stderr.on("data", (data: Buffer | string) => {
        const text = data.toString();
        // Check for ffmpeg progress: frame=... time=...
        if (text.includes("frame=") && text.includes("time=")) {
          if (state.phase === "init") {
            state.phase = "downloading";
            spinner.stop();
          }

          const timeMatch = text.match(/time=([\d:.]+)/);
          const sizeMatch = text.match(/(?:Lsize|size)=\s*([\d.]+\s*[KMG]i?B)/i);

          if (timeMatch?.[1]) {
            const currentTime = parseDurationSeconds(timeMatch[1]);
            let percent = 0;
            if (totalClipDuration > 0) {
              percent = (currentTime / totalClipDuration) * 100;
              if (percent > 100) percent = 100;
            }

            // Calculate speed
            if (sizeMatch?.[1]) {
              const currentBytes = parseSizeToBytes(sizeMatch[1]);
              const now = Date.now();
              const deltaMs = now - lastTime;

              // Update speed every 500ms
              if (deltaMs > 500) {
                const deltaBytes = currentBytes - lastBytes;
                if (deltaBytes > 0) {
                  const bytesPerSec = (deltaBytes / deltaMs) * 1000;
                  currentSpeedStr = formatSpeed(bytesPerSec);
                }
                lastBytes = currentBytes;
                lastTime = now;
              }
            }

            renderProgress(percent, currentSpeedStr, quiet);
          }
        }
      });
    }

    emitter.on("progress", (progress) => {
      if (state.phase === "init") {
        state.phase = "downloading";
        spinner.stop();
      }
      if (progress.percent !== undefined) {
        renderProgress(progress.percent, progress.currentSpeed, quiet);
      }
    });

    emitter.on("ytDlpEvent", (eventType, eventData) => {
      state.outputBuffer += `[${eventType}] ${eventData}\n`;

      // Extract file name from destination
      if (eventType === "ExtractAudio" || eventType === "Merger") {
        // Try standard Destination pattern
        let match = eventData.match(/Destination:\s*(.+)/);
        // Try Merger pattern: Merging formats into "filename"
        if (!match) {
          match = eventData.match(/Merging formats into "(.+)"/);
        }

        if (match?.[1]) {
          state.fileName = match[1].split("/").pop() || null;
        }
      }

      // Handle start of download for clips
      if (eventType === "info" && eventData.includes("Downloading 1 time ranges")) {
        if (state.phase === "init") {
          state.phase = "downloading";
          spinner.stop();
        }
      }

      if (eventType === "download") {
        if (state.phase === "init") {
          state.phase = "downloading";
          spinner.stop();
        }

        const destMatch = eventData.match(/Destination:\s*(.+)/);
        if (destMatch?.[1]) {
          state.fileName = destMatch[1].split("/").pop() || null;
        }

        // Extract file size
        const sizeMatch = eventData.match(/~?([\d.]+\s*[KMG]i?B)/i);
        if (sizeMatch?.[1]) {
          state.fileSize = sizeMatch[1];
        }

        // Fallback progress parsing for clips
        // Strip ANSI codes first
        const cleanData = eventData.replace(/\u001b\[.*?m/g, "");
        const percentMatch = cleanData.match(/(\d+(?:\.\d+)?)%/);

        if (percentMatch?.[1]) {
          // Ensure phase is downloading to allow rendering
          if (state.phase !== "downloading") {
            state.phase = "downloading";
            spinner.stop();
          }

          const percent = parseFloat(percentMatch[1]);
          const speedMatch = cleanData.match(/at\s+([~\d.]+\s*[KMG]i?B\/s)/);
          const speed = speedMatch?.[1];
          renderProgress(percent, speed || undefined, quiet);
        }
      }

      // Handle converting phase
      if ((eventType === "ExtractAudio" || eventType === "ffmpeg") && state.phase !== "converting") {
        state.phase = "converting";
        spinner.stop();
        clearLine();

        if (!quiet) {
          let frame = 0;
          state.convertingInterval = setInterval(() => {
            const frameChar = SPINNER_FRAMES[frame++ % SPINNER_FRAMES.length] ?? "⠋";
            write(`\r${c.info(frameChar)} ${c.dim("Converting...")}`);
          }, SPINNER_INTERVAL_MS);
        }
      }

      // Update spinner during init
      if (state.phase === "init") {
        if (eventType === "youtube" && eventData.includes("Extracting")) {
          spinner.update("Extracting...");
        } else if (eventType === "youtube" && eventData.includes("Downloading webpage")) {
          spinner.update("Fetching info...");
        }
      }
    });

    emitter.on("error", (error) => {
      cleanup();
      const outputError = mapOutputToError(String(error), url);
      resume(
        Effect.fail(
          outputError ??
          new BinaryExecutionError({
            exitCode: -1,
            message: String(error),
          })
        )
      );
    });

    emitter.on("close", () => {
      cleanup();

      // Check if we have output that indicates an error
      const outputError = mapOutputToError(state.outputBuffer, url);
      if (outputError) {
        resume(Effect.fail(outputError));
        return;
      }

      // Check process exit code
      const exitCode = emitter.ytDlpProcess?.exitCode;
      if (exitCode !== null && exitCode !== undefined && exitCode !== 0) {
        resume(Effect.fail(mapExitCodeToError(exitCode, url)));
        return;
      }

      resume(
        Effect.succeed({
          filePath: downloadDir,
          fileName: state.fileName || "audio",
          fileSize: state.fileSize || undefined,
        })
      );
    });
  });
}

export const DownloadServiceLive = Layer.effect(
  DownloadService,
  Effect.gen(function* () {
    const binary = yield* BinaryService;
    const settings = yield* SettingsService;

    return {
      download: (url: string, options: DownloadOptions) =>
        Effect.gen(function* () {
          const [downloadDir, ytDlpWrap, ffmpegPath] = yield* Effect.all([
            settings.getDownloadDir.pipe(
              Effect.flatMap((dir) => ensureDirectory(dir))
            ),
            binary.getYtDlpWrap,
            binary.requireFFmpeg,
          ]);

          const quiet = options.quiet ?? false;
          // IMPORTANT: If clip is requested, we do NOT pass it to buildArgs
          // This ensures yt-dlp downloads the FULL video using native threads
          const args = buildArgs(url, options, downloadDir, ffmpegPath);

          // Execute download
          const result = yield* executeDownload(
            ytDlpWrap,
            args,
            downloadDir,
            url,
            options
          );

          // If this was a clip, perform the cut now
          if (options.clip && ffmpegPath && result.fileName && result.filePath) {
            const fullFilePath = path.join(result.filePath, result.fileName);

            // Verify the file exists
            if (!fs.existsSync(fullFilePath)) {
              // If we can't find the file, we can't cut it. Just return the result.
              if (!quiet) console.error(c.error(`\nCould not find full file for cutting: ${fullFilePath}`));
              return result;
            }

            // Parse start/end times
            const parts = options.clip.split("-");
            if (parts.length === 2 && parts[0] && parts[1]) {
              const startTime = parts[0];
              const endTime = parts[1];

              // Generate output filename
              const ext = path.extname(result.fileName);
              const baseName = path.basename(result.fileName, ext);
              const clipFileName = `${baseName}_clip${ext}`;
              const clipFilePath = path.join(result.filePath, clipFileName);

              if (!quiet) console.log(c.dim(`\nCutting clip: ${startTime} to ${endTime}...`));

              // Run ffmpeg manually
              yield* Effect.async<void, BinaryExecutionError>((resume) => {
                const ffmpeg = spawn(ffmpegPath, [
                  "-i", fullFilePath,
                  "-ss", startTime,
                  "-to", endTime,
                  "-c", "copy",
                  "-y", // Overwrite output
                  clipFilePath
                ]);

                ffmpeg.on("close", (code: number | null) => {
                  if (code === 0) {
                    // Delete full file
                    try {
                      fs.unlinkSync(fullFilePath);
                    } catch (e) {
                      // Ignore deletion error
                    }
                    // Update result to point to clip
                    result.fileName = clipFileName;
                    result.fileSize = undefined; // Unknown new size
                    resume(Effect.void);
                  } else {
                    resume(Effect.fail(new BinaryExecutionError({
                      exitCode: code || -1,
                      message: "Failed to cut clip with ffmpeg"
                    })));
                  }
                });

                // Handle spawn errors
                ffmpeg.on("error", (err: Error) => {
                  resume(Effect.fail(new BinaryExecutionError({
                    exitCode: -1,
                    message: `FFmpeg spawn error: ${err.message}`
                  })));
                });
              });
            }
          }

          return result;
        }),
    };
  })
);
