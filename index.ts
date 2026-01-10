#!/usr/bin/env node

import { program } from "commander";
import { APP_NAME, APP_VERSION, DEFAULT_FORMAT } from "./src/config";
import { AppLive, BinaryLive, SettingsLive } from "./src/layers";
import {
  runCommand,
  prepareCommand,
  setFolderCommand,
  downloadCommand,
  type FolderOptions,
} from "./src/cli";
import type { DownloadOptions } from "./src/services";
import { showBanner } from "./src/banner";

// ─────────────────────────────────────────────────────────────
// URL Detection
// ─────────────────────────────────────────────────────────────

const isUrl = (arg: string): boolean =>
  arg.startsWith("http://") || arg.startsWith("https://");

// ─────────────────────────────────────────────────────────────
// CLI Configuration
// ─────────────────────────────────────────────────────────────

const configureCli = () => {
  // Main program handles direct URL downloads
  program
    .name(APP_NAME)
    .usage("<url> [options]")
    .description("Download audio or video from YouTube")
    .version(APP_VERSION, "-v, --version")
    .argument("[url]", "YouTube URL to download")
    .option("-f, --format <format>", "Output format (mp3, mp4, mkv, etc.)", DEFAULT_FORMAT)
    .option("-c, --clip <range>", "Clip range (e.g. 1:30-2:45)")
    .option("-q, --quiet", "Minimal output (only file name)")
    .addHelpText("beforeAll", "")
    .hook("preAction", (cmd) => {
      const isHelp =
        cmd.args.includes("help") ||
        process.argv.includes("--help") ||
        process.argv.includes("-h");
      if (isHelp) showBanner();
    })
    .action((url?: string, opts?: DownloadOptions) => {
      // Only run download if URL is provided and it's a valid URL
      if (url && isUrl(url)) {
        const options: DownloadOptions = {
          format: opts?.format ?? DEFAULT_FORMAT,
          clip: opts?.clip,
          quiet: opts?.quiet,
        };
        return runCommand(downloadCommand(url, options), AppLive);
      }
      // If no URL or not a valid URL, let subcommands handle it
    });

  program
    .command("prepare")
    .description("Download yt-dlp binary")
    .action(() => runCommand(prepareCommand, BinaryLive));

  program
    .command("setDefaultFolder [path]")
    .description("Set or view default download folder")
    .option("-r, --reset", "Reset to current directory")
    .action((path?: string, opts?: FolderOptions) =>
      runCommand(setFolderCommand(path, opts), SettingsLive)
    );

  return program;
};

// ─────────────────────────────────────────────────────────────
// Entry Point
// ─────────────────────────────────────────────────────────────

const main = () => {
  // Show help with banner if no arguments
  if (process.argv.length <= 2) {
    showBanner();
    configureCli().help();
    return;
  }

  // Show banner for version
  if (process.argv.includes("-v") || process.argv.includes("--version")) {
    showBanner();
  }

  configureCli().parse();
};

main();
