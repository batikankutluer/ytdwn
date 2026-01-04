import cfonts from "cfonts";
import gradient from "gradient-string";
import { APP_NAME, APP_TAGLINE } from "./config";

// ─────────────────────────────────────────────────────────────
// Banner Configuration
// ─────────────────────────────────────────────────────────────

const GRADIENT_COLORS = ["#ff6b6b", "#feca57", "#48dbfb", "#ff9ff3", "#54a0ff"];

// ─────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────

/**
 * Renders a stylish ASCII banner with gradient colors
 */
export function showBanner(): void {
  const result = cfonts.render(APP_NAME, {
    font: "block",
    align: "left",
    colors: ["system"],
    background: "transparent",
    letterSpacing: 1,
    lineHeight: 0,
    space: false,
    maxLength: 0,
    rawMode: true,
  });

  if (result && typeof result !== "boolean" && result.string) {
    const gradientBanner = gradient(GRADIENT_COLORS)(result.string);
    console.log(gradientBanner);
  }
  console.log(gradient(GRADIENT_COLORS)(`  ${APP_TAGLINE}\n\n`));
}

/**
 * Renders a compact one-line banner
 */
export function showCompactBanner(): void {
  console.log(gradient(GRADIENT_COLORS)(`♫ ${APP_NAME}`));
}
