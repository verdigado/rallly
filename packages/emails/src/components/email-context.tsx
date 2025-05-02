import { i18nDefaultConfig, i18nInstance } from "../i18n";
import type { EmailContext } from "../types";

i18nInstance.init({
  ...i18nDefaultConfig,
  // In email development mode, i18next translations will only work if translation files 
  // are loaded synchronously. Therefore, this flag must be set to false.
  initImmediate: false,
});

export const previewEmailContext: EmailContext = {
  logoUrl: "https://d39ixtfgglw55o.cloudfront.net/images/rallly-logo-mark.png",
  baseUrl: "https://rallly.co",
  domain: "rallly.co",
  supportEmail: "support@rallly.co",
  i18n: i18nInstance,
  t: i18nInstance.t,
};
