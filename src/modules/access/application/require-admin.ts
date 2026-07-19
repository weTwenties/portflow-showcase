import "server-only";

import { cookies, headers } from "next/headers";

import { AppError } from "@/lib/api/app-error";
import { getServerEnv } from "@/lib/env/server";
import {
  ADMIN_SESSION_COOKIE,
  verifyAdminSession,
} from "@/modules/access/infrastructure/admin-session";
import { verifyAccessJwt } from "@/modules/access/infrastructure/cloudflare-access-verifier";

import { isAllowedAdminEmail } from "./admin-email";

export const ACCESS_JWT_HEADER = "cf-access-jwt-assertion";

export type AdminIdentity = {
  email: string;
  method: "cloudflare-access" | "password" | "dev-bypass";
};

/**
 * Application-layer admin gate for every admin page and write API.
 *
 * Auth mode is selected via `ADMIN_AUTH_MODE`:
 * - `cloudflare_access` — verify Cloudflare Access JWT (edge login + origin check)
 * - `password` — verify signed httpOnly session cookie from username/password login
 *
 * `DEV_ADMIN_BYPASS` still short-circuits in local development only.
 */
export async function requireAdmin(): Promise<AdminIdentity> {
  const env = getServerEnv();

  if (env.DEV_ADMIN_BYPASS && env.NODE_ENV === "development") {
    return { email: env.ADMIN_EMAIL, method: "dev-bypass" };
  }

  if (env.ADMIN_AUTH_MODE === "password") {
    return requirePasswordAdmin(env.ADMIN_EMAIL, env.UPLOAD_TOKEN_SECRET);
  }

  return requireCloudflareAdmin(env);
}

async function requirePasswordAdmin(
  adminEmail: string,
  sessionSecret: string,
): Promise<AdminIdentity> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;

  if (!token) {
    throw new AppError("UNAUTHENTICATED", "Missing admin session");
  }

  try {
    const session = await verifyAdminSession(token, sessionSecret);
    if (!isAllowedAdminEmail(session.email, adminEmail)) {
      throw new AppError("FORBIDDEN", "This account is not the site admin");
    }
    return { email: session.email, method: "password" };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError("UNAUTHENTICATED", "Invalid or expired admin session");
  }
}

async function requireCloudflareAdmin(env: {
  ADMIN_EMAIL: string;
  CF_ACCESS_TEAM_DOMAIN: string;
  CF_ACCESS_AUDS: ReadonlySet<string>;
}): Promise<AdminIdentity> {
  const headerList = await headers();
  const token = headerList.get(ACCESS_JWT_HEADER);

  if (!token) {
    throw new AppError(
      "UNAUTHENTICATED",
      "Missing Cloudflare Access token",
    );
  }

  const { email } = await verifyAccessJwt(token, {
    teamDomain: env.CF_ACCESS_TEAM_DOMAIN,
    allowedAuds: env.CF_ACCESS_AUDS,
  });

  if (!isAllowedAdminEmail(email, env.ADMIN_EMAIL)) {
    throw new AppError("FORBIDDEN", "This account is not the site admin");
  }

  return { email, method: "cloudflare-access" };
}
