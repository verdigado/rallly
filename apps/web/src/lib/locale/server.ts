import { defaultLocale, supportedLngs } from "@rallly/languages";
import { getPreferredLocaleFromHeaders } from "@rallly/languages/get-preferred-locale";
import type { NextRequest, NextResponse } from "next/server";
import { LOCALE_COOKIE_NAME } from "@/lib/locale/constants";

export function getLocaleFromRequest(req: NextRequest) {
  const localeCookie = req.cookies.get(LOCALE_COOKIE_NAME);
  if (localeCookie) {
    if (supportedLngs.includes(localeCookie.value)) {
      return localeCookie.value;
    }
  }

  const acceptLanguageHeader = req.headers.get("accept-language");

  if (!acceptLanguageHeader) {
    return defaultLocale;
  }

  return getPreferredLocaleFromHeaders({
    acceptLanguageHeader,
  });
}

export function setLocaleCookie(
  res: NextResponse,
  locale: string,
) {
  res.cookies.set(LOCALE_COOKIE_NAME, locale, {
    path: "/",
  });
}
