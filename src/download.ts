import { mkdir } from "fs/promises";
import { spawn, type ChildProcess } from "child_process";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import {
  DEFAULT_AUDIO_QUALITY,
  CONCURRENT_FRAGMENTS,
  getOutputTemplate,
} from "./config";
import { parseClipRange } from "./timestamp";
import { requireBinary } from "./binary";
import { getDownloadDir } from "./settings";
import { c } from "./colors";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface DownloadOptions {
  format: string;
  clip?: string;
  quiet?: boolean;
}

interface ProgressInfo {
  percent: number;
  downloaded?: string;
  total?: string;
  speed?: string;
}

type Phase = "init" | "downloading" | "converting";

interface DownloadResult {
  filePath: string;
  fileName: string;
  fileSize?: string;
}

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const SPINNER_FRAMES = [
  "⠋",
  "⠙",
  "⠹",
  "⠸",
  "⠼",
  "⠴",
  "⠦",
  "⠧",
  "⠇",
  "⠏",
] as const;
const SPINNER_INTERVAL_MS = 80;
const PROGRESS_BAR_WIDTH = 12;
const LINE_CLEAR_WIDTH = 60;

// Pre-compiled regex patterns for performance
const REGEX = {
  percent: /(\d+\.?\d*)%/,
  total: /of\s+~?([\d.]+\s*\w+)/i,
  speed: /at\s+([\d.]+\s*\w+\/s)/i,
  size: /([\d.]+)\s*(\w+)/,
  binaryUnits: /([KMG])iB/g,
  destination: /\[(?:ExtractAudio|Merger)\].*?Destination:\s*(.+)$/m,
  downloadDest: /\[download\]\s+Destination:\s*(.+)$/m,
  fileSize: /~?([\d.]+\s*[KMG]i?B)/i,
} as const;

const PHASE_MESSAGES: ReadonlyMap<string, string> = new Map([
  ["Extracting URL", "Extracting..."],
  ["Downloading webpage", "Fetching info..."],
]);

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
    return {
      update: () => {},
      stop: () => {},
    };
  }

  const interval = setInterval(() => {
    if (!stopped) {
      const frameChar = SPINNER_FRAMES[frame++ % SPINNER_FRAMES.length] ?? "⠋";
      write(`\r${c.info(frameChar)} ${c.dim(message)}`);
    }
  }, SPINNER_INTERVAL_MS);

  return {
    update: (msg: string) => {
      message = msg;
    },
    stop: () => {
      if (stopped) return;
      stopped = true;
      clearInterval(interval);
      clearLine();
    },
  };
}

function renderProgress({ percent, speed }: ProgressInfo, quiet = false) {
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
// Progress Parsing
// ─────────────────────────────────────────────────────────────

const normalizeUnit = (value: string) =>
  value.replace(REGEX.binaryUnits, "$1B");

function parseProgress(text: string): ProgressInfo | null {
  const percentMatch = text.match(REGEX.percent);
  if (!percentMatch?.[1]) return null;

  const percent = parseFloat(percentMatch[1]);
  const total = text.match(REGEX.total)?.[1]?.trim();
  const speed = text.match(REGEX.speed)?.[1];

  let downloaded: string | undefined;
  if (total) {
    const [, size, unit] = total.match(REGEX.size) ?? [];
    if (size && unit) {
      downloaded = normalizeUnit(
        `${((percent / 100) * parseFloat(size)).toFixed(1)}${unit}`
      );
    }
  }

  return {
    percent,
    downloaded,
    total: total ? normalizeUnit(total) : undefined,
    speed: speed ? normalizeUnit(speed) : undefined,
  };
}

// ─────────────────────────────────────────────────────────────
// Phase Detection
// ─────────────────────────────────────────────────────────────

function detectPhase(text: string): string | null {
  for (const [pattern, message] of PHASE_MESSAGES) {
    if (text.includes(pattern)) return message;
  }
  return text.includes("Downloading") && !text.includes("%")
    ? "Preparing..."
    : null;
}

const isConvertingPhase = (text: string) =>
  text.includes("ExtractAudio") || text.includes("Converting");

function extractFileName(text: string): string | null {
  const match = text.match(REGEX.destination) || text.match(REGEX.downloadDest);
  if (match?.[1]) {
    const fullPath = match[1].trim();
    return fullPath.split("/").pop() || null;
  }
  return null;
}

function extractFileSize(text: string): string | null {
  const match = text.match(REGEX.fileSize);
  return match?.[1] || null;
}

// ─────────────────────────────────────────────────────────────
// Command Builder
// ─────────────────────────────────────────────────────────────

function buildArgs(
  url: string,
  options: DownloadOptions,
  downloadDir: string
): string[] {
  const baseArgs = [
    url,
    "-f",
    "bestaudio/best",
    "-x",
    "--audio-format",
    options.format,
    "--audio-quality",
    DEFAULT_AUDIO_QUALITY,
    "-o",
    getOutputTemplate(downloadDir),
    "--no-playlist",
    "--newline",
    "--progress",
    "--concurrent-fragments",
    CONCURRENT_FRAGMENTS,
    "--no-check-certificates",
    "--prefer-free-formats",
  ];

  const conditionalArgs: string[] = [];

  if (options.clip) {
    conditionalArgs.push(
      "--download-sections",
      `*${parseClipRange(options.clip)}`
    );
  }

  if (ffmpegInstaller?.path) {
    conditionalArgs.push("--ffmpeg-location", ffmpegInstaller.path);
  }

  return [...baseArgs, ...conditionalArgs];
}

// ─────────────────────────────────────────────────────────────
// Download Handler
// ─────────────────────────────────────────────────────────────

interface OutputState {
  phase: Phase;
  lastPercent: number;
  fileName: string | null;
  fileSize: string | null;
  quiet: boolean;
  convertingInterval: ReturnType<typeof setInterval> | null;
}

function createOutputHandler(
  spinner: ReturnType<typeof createSpinner>,
  state: OutputState
) {
  return (data: Buffer) => {
    const text = data.toString();

    // Capture file name
    const fileName = extractFileName(text);
    if (fileName) state.fileName = fileName;

    // Capture file size
    const fileSize = extractFileSize(text);
    if (fileSize) state.fileSize = fileSize;

    // Phase: Converting
    if (state.phase !== "converting" && isConvertingPhase(text)) {
      state.phase = "converting";
      spinner.stop();
      clearLine();

      if (!state.quiet) {
        let frame = 0;
        state.convertingInterval = setInterval(() => {
          const frameChar =
            SPINNER_FRAMES[frame++ % SPINNER_FRAMES.length] ?? "⠋";
          write(`\r${c.info(frameChar)} ${c.dim("Converting...")}`);
        }, SPINNER_INTERVAL_MS);
      }
      return;
    }

    // Phase: Downloading with progress
    const progress = parseProgress(text);
    if (progress && progress.percent > state.lastPercent) {
      if (state.phase === "init") {
        state.phase = "downloading";
        spinner.stop();
      }
      state.lastPercent = progress.percent;
      renderProgress(progress, state.quiet);
      return;
    }

    // Phase: Init spinner updates
    if (state.phase === "init") {
      const message = detectPhase(text);
      if (message) spinner.update(message);
    }
  };
}

function attachProcessHandlers(
  child: ChildProcess,
  spinner: ReturnType<typeof createSpinner>,
  downloadDir: string,
  quiet: boolean
): Promise<DownloadResult> {
  return new Promise((resolve, reject) => {
    const state: OutputState = {
      phase: "init",
      lastPercent: 0,
      fileName: null,
      fileSize: null,
      quiet,
      convertingInterval: null,
    };
    const handleOutput = createOutputHandler(spinner, state);

    const cleanup = () => {
      spinner.stop();
      if (state.convertingInterval) {
        clearInterval(state.convertingInterval);
      }
      if (!quiet) clearLine();
    };

    child.stdout?.on("data", handleOutput);
    child.stderr?.on("data", handleOutput);

    child.on("close", (code) => {
      cleanup();
      if (code === 0) {
        resolve({
          filePath: downloadDir,
          fileName: state.fileName || "audio",
          fileSize: state.fileSize || undefined,
        });
      } else {
        reject(new Error(`Download failed (code ${code})`));
      }
    });

    child.on("error", (err) => {
      cleanup();
      reject(err);
    });
  });
}

// ─────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────

/**
 * Downloads audio from a URL using yt-dlp.
 * @returns Download result with file info
 */
export async function downloadAudio(
  url: string,
  options: DownloadOptions
): Promise<DownloadResult> {
  const [downloadDir, binaryPath] = await Promise.all([
    getDownloadDir().then(async (dir) => {
      await mkdir(dir, { recursive: true });
      return dir;
    }),
    requireBinary(),
  ]);

  const quiet = options.quiet ?? false;
  const spinner = createSpinner("Getting ready...", quiet);
  const child = spawn(binaryPath, buildArgs(url, options, downloadDir));

  return attachProcessHandlers(child, spinner, downloadDir, quiet);
}
