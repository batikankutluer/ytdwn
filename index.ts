#!/usr/bin/env node

import { program } from "commander";
import { APP_NAME, APP_VERSION, DEFAULT_FORMAT } from "./src/config";
import { findBinary, downloadLatestBinary } from "./src/binary";
import { downloadAudio } from "./src/download";
import {
  getDownloadDir,
  setDownloadDir,
  resetDownloadDir,
} from "./src/settings";
import { c } from "./src/colors";
import { showBanner } from "./src/banner";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface DownloadOpts {
  format: string;
  clip?: string;
  quiet?: boolean;
}

interface FolderOpts {
  reset?: boolean;
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

const formatError = (err: unknown): string => {
  const msg = err instanceof Error ? err.message : String(err);

  // Smart error messages
  if (msg.includes("code 1") || msg.includes("Video unavailable")) {
    return "Video not found or private";
  }
  if (msg.includes("code 2")) {
    return "Invalid URL format";
  }
  if (msg.includes("age")) {
    return "Age-restricted video (login required)";
  }
  if (msg.includes("network") || msg.includes("connect")) {
    return "Connection error, try again";
  }

  return msg;
};

const exitWithError = (err: unknown): never => {
  console.error(`${c.sym.error} ${c.error("Error:")} ${formatError(err)}`);
  process.exit(1);
};

const isUrl = (arg: string) =>
  arg.startsWith("http://") || arg.startsWith("https://");

// ─────────────────────────────────────────────────────────────
// Commands
// ─────────────────────────────────────────────────────────────

async function handlePrepare() {
  try {
    if (await findBinary()) {
      console.log(`${c.sym.success} ${c.success("Ready")}`);
      return;
    }

    console.log(`${c.dim("Downloading yt-dlp...")}`);
    await downloadLatestBinary();
    console.log(`${c.sym.success} ${c.success("Ready")}`);
  } catch (err) {
    exitWithError(err);
  }
}

async function handleSetFolder(folderPath?: string, opts?: FolderOpts) {
  try {
    if (opts?.reset) {
      await resetDownloadDir();
      console.log(
        `${c.sym.success} ${c.success("Reset to current directory")}`
      );
      return;
    }

    if (folderPath) {
      await setDownloadDir(folderPath);
      console.log(`${c.sym.success} ${c.info(folderPath)}`);
    } else {
      console.log(c.info(await getDownloadDir()));
    }
  } catch (err) {
    exitWithError(err);
  }
}

async function handleDownload(url: string, opts: DownloadOpts) {
  try {
    // Show banner at the start (stays fixed while processing)
    if (!opts.quiet) {
      showBanner();
      console.log(`${c.dim("URL:")} ${c.info(url)}\n`);
    }

    const result = await downloadAudio(url, {
      format: opts.format,
      clip: opts.clip,
      quiet: opts.quiet,
    });

    if (opts.quiet) {
      // Quiet mode: just output the file name
      console.log(result.fileName);
    } else {
      // Normal mode: show completion below banner
      console.log(); // New line after progress
      console.log(`${c.sym.success} ${c.success("Process done!")}\n`);
      const sizeInfo = result.fileSize
        ? ` ${c.size(`(${result.fileSize})`)}`
        : "";
      console.log(`${c.file(result.fileName)}${sizeInfo}`);
    }
  } catch (err) {
    exitWithError(err);
  }
}

// ─────────────────────────────────────────────────────────────
// CLI Setup
// ─────────────────────────────────────────────────────────────

program
  .name(APP_NAME)
  .usage("<url> [options]")
  .description("Download audio from YouTube")
  .version(APP_VERSION, "-v, --version")
  .option("-f, --format <format>", "Audio format", DEFAULT_FORMAT)
  .option("-c, --clip <range>", "Clip range (e.g. 1:30-2:45)")
  .option("-q, --quiet", "Minimal output (only file name)")
  .addHelpText("beforeAll", "")
  .hook("preAction", (thisCommand) => {
    // Show banner only for help command
    if (
      thisCommand.args.includes("help") ||
      process.argv.includes("--help") ||
      process.argv.includes("-h")
    ) {
      showBanner();
    }
  });

program
  .command("prepare")
  .description("Download yt-dlp binary")
  .action(handlePrepare);

program
  .command("setDefaultFolder [path]")
  .description("Set or view default download folder")
  .option("-r, --reset", "Reset to current directory")
  .action(handleSetFolder);

program
  .command("download <url>", { hidden: true })
  .description("Download audio from YouTube URL")
  .option("-f, --format <format>", "Audio format", DEFAULT_FORMAT)
  .option("-c, --clip <range>", "Clip range (e.g. 1:30-2:45)")
  .option("-q, --quiet", "Minimal output")
  .action(handleDownload);

// ─────────────────────────────────────────────────────────────
// Entry Point
// ─────────────────────────────────────────────────────────────

// Auto-detect URL as first argument
const firstArg = process.argv[2];
if (firstArg && isUrl(firstArg)) {
  process.argv.splice(2, 0, "download");
}

// Show help with banner if no arguments
if (process.argv.length <= 2) {
  showBanner();
  program.help();
}

// Show banner for version
if (process.argv.includes("-v") || process.argv.includes("--version")) {
  showBanner();
}

program.parse();
