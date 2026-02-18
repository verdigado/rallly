import { i18nDefaultConfig, i18nInstance } from "../i18n";
import type { EmailContext } from "../types";

i18nInstance.init({
  ...i18nDefaultConfig,
  // In email development mode, i18next translations will only work if translation files
  // are loaded synchronously. Therefore, this flag must be set to false.
  initImmediate: false,
});

export const previewEmailContext: EmailContext = {
  logoUrl: "https://termite.gruene.de/logo.png",
  baseUrl: "https://termite.gruene.de",
  domain: "termite.gruene.de",
  supportEmail: "support@termite.gruene.de",
  i18n: i18nInstance,
  t: i18nInstance.t,
  appName: "Termite",
  primaryColor: "#005437",
  hideAttribution: true,
};
