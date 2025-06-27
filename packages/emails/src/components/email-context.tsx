import { i18nDefaultConfig, i18nInstance } from "../i18n";
import { EmailContext } from "../types";

i18nInstance.init({
  ...i18nDefaultConfig,
  initImmediate: true,
});

export const previewEmailContext: EmailContext = {
  logoUrl: "https://termite.gruene.de/logo.png",
  baseUrl: "https://rallly.co",
  domain: "rallly.co",
  supportEmail: "support@rallly.co",
  i18n: i18nInstance,
  t: i18nInstance.getFixedT("en"),
};
