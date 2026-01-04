import pc from "picocolors";

// ─────────────────────────────────────────────────────────────
// Color Utilities
// ─────────────────────────────────────────────────────────────

export const c = {
  // Status
  success: (text: string) => pc.green(text),
  error: (text: string) => pc.red(text),
  warn: (text: string) => pc.yellow(text),
  info: (text: string) => pc.cyan(text),

  // Content
  dim: (text: string) => pc.dim(text),
  bold: (text: string) => pc.bold(text),
  file: (text: string) => pc.bold(pc.white(text)),
  size: (text: string) => pc.dim(text),
  speed: (text: string) => pc.cyan(text),

  // Progress
  bar: {
    filled: (text: string) => pc.green(text),
    empty: (text: string) => pc.dim(text),
    percent: (text: string) => pc.bold(text),
  },

  // Symbols
  sym: {
    success: pc.green("✓"),
    error: pc.red("✗"),
    warn: pc.yellow("⚠"),
    info: pc.cyan("ℹ"),
    arrow: pc.dim("→"),
  },
};
