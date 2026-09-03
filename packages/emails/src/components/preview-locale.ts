/**
 * Locale used by the react-email preview server (`pnpm dev`). Override with
 * `REACT_EMAIL_LANG=de pnpm dev` to preview emails in another locale.
 */
export const previewLocale = process.env.REACT_EMAIL_LANG ?? "en";
