import { absoluteUrl } from "@rallly/utils/absolute-url";
import {
  anonymousClient,
  emailOTPClient,
  genericOAuthClient,
  inferAdditionalFields,
  lastLoginMethodClient,
} from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { signOut as nextAuthSignOut } from "next-auth/react";
import type { Auth } from "@/lib/auth";

export const authClient = createAuthClient({
  baseURL: absoluteUrl("/api/better-auth"),
  plugins: [
    inferAdditionalFields<Auth>(),
    emailOTPClient(),
    genericOAuthClient(),
    lastLoginMethodClient(),
    anonymousClient(),
  ],
});

export async function signOut() {
  let logoutUrl: string | null = null;

  try {
    // Attempt to get a federated logout URL from the server *before* signing out
    const res = await fetch(absoluteUrl("/api/auth/oidc-logout"));

    if (res.ok) {
      const data = await res.json();
      // If a logout URL is provided, store it for later
      if (data.logoutUrl) {
        logoutUrl = data.logoutUrl;
      }
    }
  } catch (error) {
    console.error(
      "Failed to fetch OIDC logout URL, proceeding with local logout.",
      error,
    );
  }

  // Perform local sign out from both auth libraries
  await Promise.all([
    authClient.signOut(),
    nextAuthSignOut({ redirect: false }),
  ]);

  // Redirect to the OIDC provider if a URL was fetched
  if (logoutUrl) {
    window.location.href = logoutUrl;
    return;
  }

  // Fallback for non-OIDC or if the API fails: redirect to the login page
  window.location.href = absoluteUrl("/login");
}
