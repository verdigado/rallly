import { prisma } from "@rallly/database";
import { logger } from "@rallly/logger";
import { absoluteUrl } from "@rallly/utils/absolute-url";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { env } from "@/env";
import authLib from "@/lib/auth";

export async function GET() {
  try {
    if (!env.OIDC_END_SESSION_ENDPOINT) {
      logger.error("OIDC_END_SESSION_ENDPOINT is not configured.");
      return new NextResponse("OIDC logout is not configured on the server.", {
        status: 500,
      });
    }

    const session = await authLib.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const oidcAccount = await prisma.account.findFirst({
      where: {
        userId: session.user.id,
        provider: "oidc",
      },
    });

    const idToken = oidcAccount?.id_token;

    const logoutUrl = new URL(env.OIDC_END_SESSION_ENDPOINT);
    logoutUrl.searchParams.set(
      "post_logout_redirect_uri",
      absoluteUrl("/login"),
    );

    if (idToken) {
      logoutUrl.searchParams.set("id_token_hint", idToken);
    }

    return NextResponse.json({ logoutUrl: logoutUrl.toString() });
  } catch (error) {
    logger.error(error, "Failed to construct logout URL");
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
