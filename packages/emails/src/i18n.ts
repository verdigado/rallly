import { supportedLngs } from "@rallly/languages";
import fs from "fs";
import type { InitOptions } from "i18next";
import { createInstance } from "i18next";
import resourcesToBackend from "i18next-resources-to-backend";
import { initReactI18next } from "react-i18next/initReactI18next";

// Function to load translation files synchronously
// Dynamic import statements return a promise, which is unsuitable here
// Files will be imported relative to `packages/emails`
function loadJSONSync(path: string) {
  return JSON.parse(fs.readFileSync(path, { encoding: "utf-8" }));
}

const i18nInstance = createInstance();

i18nInstance
  .use(initReactI18next)
  .use(
    resourcesToBackend((language: string, namespace: string) =>
      loadJSONSync(`locales/${language}/${namespace}.json`),
    ),
  );

const lng = "en";

const i18nDefaultConfig: InitOptions = {
  lng,
  supportedLngs: supportedLngs,
  preload: [lng, ...(lng === "en" ? [] : ["en"])],
  fallbackLng: "en",
  ns: ["emails"],
  fallbackNS: "emails",
  defaultNS: "emails",
  interpolation: {
    escapeValue: false,
  },
} as const;

export type I18nInstance = typeof i18nInstance;

export { i18nDefaultConfig, i18nInstance };
