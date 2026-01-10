import { Layer } from "effect";
import { SettingsServiceLive } from "../services/SettingsService";
import { BinaryServiceLive } from "../services/BinaryService";
import { DownloadServiceLive } from "../services/DownloadService";

// ─────────────────────────────────────────────────────────────
// Application Layer Composition
// ─────────────────────────────────────────────────────────────

/**
 * Composes all service layers into a single application layer.
 * This is the production layer used at the application boundary.
 */
export const AppLive = DownloadServiceLive.pipe(
  Layer.provide(BinaryServiceLive),
  Layer.provide(SettingsServiceLive)
);

/**
 * Settings-only layer for commands that don't need download capabilities.
 */
export const SettingsLive = SettingsServiceLive;

/**
 * Binary management layer (includes settings).
 */
export const BinaryLive = BinaryServiceLive.pipe(
  Layer.provide(SettingsServiceLive)
);
