import "server-only";

import { prisma } from "@rallly/database";

export async function getOidcAccountForUser(userId: string) {
  return prisma.account.findFirst({
    where: {
      userId,
      provider: "oidc",
    },
    // Better Auth creates a new account row on each OIDC re-login rather
    // than updating the existing one for the same user+provider, so more
    // than one can exist — always take the most recently linked one, since
    // its idToken is the only one still valid against the IdP's current
    // session/signing key.
    orderBy: { updatedAt: "desc" },
  });
}
