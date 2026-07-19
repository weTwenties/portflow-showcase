import { cookies } from "next/headers";

import { getServerEnv } from "@/lib/env/server";
import {
  ADMIN_SESSION_COOKIE,
  adminSessionCookieOptions,
} from "@/modules/access/infrastructure/admin-session";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" } as const;

/** Clears the password-mode admin session cookie. */
export async function POST(): Promise<Response> {
  const env = getServerEnv();
  const cookieStore = await cookies();
  const options = adminSessionCookieOptions(env.NODE_ENV === "production");

  // Must match path/secure/sameSite used at login or the browser keeps the cookie.
  cookieStore.set(ADMIN_SESSION_COOKIE, "", {
    ...options,
    maxAge: 0,
    expires: new Date(0),
  });

  return Response.json({ ok: true }, { status: 200, headers: NO_STORE });
}
