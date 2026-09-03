import type { EmailChrome } from "../types";

/**
 * Sample branding/env used by the react-email preview server (`pnpm dev`).
 * Real sends build `chrome` from the caller's branding + env via `resolveChrome`.
 */
export const previewChrome: EmailChrome = {
  logoUrl: "https://termite.gruene.de/logo.png",
  baseUrl: "https://termite.gruene.de",
  domain: "termite.gruene.de",
  supportEmail: "support@termite.gruene.de",
  appName: "Termite",
  primaryColor: "#005437",
  hideAttribution: true,
};
