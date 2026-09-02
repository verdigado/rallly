#!/usr/bin/env node
// Mints a short-lived (~1h) GitHub App installation access token scoped to
// exactly the repos this App is installed on (verdigado/rallly only).
//
// Required env vars:
//   GITHUB_APP_ID                 - the App's numeric ID
//   GITHUB_APP_INSTALLATION_ID    - the installation's numeric ID
//   GITHUB_APP_PRIVATE_KEY_PATH   - path to the App's .pem private key
//
// Prints the token, and only the token, to stdout. Everything else goes to
// stderr so `TOKEN=$(node get-installation-token.mjs)` works cleanly.
//
// Deliberately does not use `gh` or any pre-existing git/gh credential on the
// host: this mints a fresh, narrowly-scoped token from the App's own key on
// every call, so a broader ambient credential sitting in `gh auth login`
// state can never get used by mistake. See feature/64-fork-sync-automation.

import { createSign } from "node:crypto";
import { readFileSync } from "node:fs";

function base64url(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function buildAppJwt(appId, privateKeyPem) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iat: now - 60, // allow for clock drift
    exp: now + 600, // GitHub's max is 10 minutes
    iss: appId,
  };
  const signingInput = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`;
  const signature = createSign("RSA-SHA256")
    .update(signingInput)
    .sign(privateKeyPem);
  return `${signingInput}.${base64url(signature).replace(/\+/g, "-").replace(/\//g, "_")}`;
}

async function main() {
  const appId = process.env.GITHUB_APP_ID;
  const installationId = process.env.GITHUB_APP_INSTALLATION_ID;
  const privateKeyPath = process.env.GITHUB_APP_PRIVATE_KEY_PATH;

  if (!appId || !installationId || !privateKeyPath) {
    console.error(
      "Missing one of GITHUB_APP_ID, GITHUB_APP_INSTALLATION_ID, GITHUB_APP_PRIVATE_KEY_PATH",
    );
    process.exit(1);
  }

  const privateKeyPem = readFileSync(privateKeyPath, "utf8");
  const jwt = buildAppJwt(appId, privateKeyPem);

  const response = await fetch(
    `https://api.github.com/app/installations/${installationId}/access_tokens`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${jwt}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    },
  );

  if (!response.ok) {
    console.error(
      `Installation token exchange failed: ${response.status} ${await response.text()}`,
    );
    process.exit(1);
  }

  const { token } = await response.json();
  process.stdout.write(token);
}

main();
