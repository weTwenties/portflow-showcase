import { cookies } from "next/headers";
import { z } from "zod";

import { AppError, isAppError, type ApiError } from "@/lib/api/app-error";
import { isRateLimited } from "@/lib/api/rate-limit";
import { getServerEnv } from "@/lib/env/server";
import { logServerEvent } from "@/lib/observability/logger";
import { verifyPasswordCredentials } from "@/modules/access/application/verify-password-credentials";
import {
  ADMIN_SESSION_COOKIE,
  adminSessionCookieOptions,
  signAdminSession,
} from "@/modules/access/infrastructure/admin-session";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" } as const;

const loginBodySchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

function errorResponse(error: AppError, requestId: string): Response {
  const body: ApiError = {
    error: {
      code: error.code,
      message: error.message,
      requestId,
    },
  };
  return Response.json(body, { status: error.status, headers: NO_STORE });
}

/**
 * Password-mode login. Intentionally outside createAdminRoute — this is the
 * unauthenticated entry that mints the session cookie.
 */
export async function POST(request: Request): Promise<Response> {
  const requestId = crypto.randomUUID();
  const startedAt = Date.now();

  try {
    const env = getServerEnv();

    if (env.ADMIN_AUTH_MODE !== "password") {
      throw new AppError(
        "VALIDATION_ERROR",
        "Password login is disabled (ADMIN_AUTH_MODE is not password)",
      );
    }

    const body = loginBodySchema.parse(await request.json());

    if (
      isRateLimited(`admin.login:${body.username.toLowerCase()}`, {
        limit: 10,
        windowMs: 60_000,
      })
    ) {
      throw new AppError("RATE_LIMITED", "Too many login attempts, slow down");
    }

    const ok = verifyPasswordCredentials({
      username: body.username,
      password: body.password,
      expectedUsername: env.ADMIN_USERNAME,
      expectedPassword: env.ADMIN_PASSWORD,
    });

    if (!ok) {
      throw new AppError("UNAUTHENTICATED", "Invalid username or password");
    }

    const token = await signAdminSession(
      { username: env.ADMIN_USERNAME, email: env.ADMIN_EMAIL },
      env.UPLOAD_TOKEN_SECRET,
    );

    const cookieStore = await cookies();
    cookieStore.set(
      ADMIN_SESSION_COOKIE,
      token,
      adminSessionCookieOptions(env.NODE_ENV === "production"),
    );

    logServerEvent("info", "admin.login", {
      requestId,
      status: 200,
      durationMs: Date.now() - startedAt,
    });

    return Response.json({ ok: true }, { status: 200, headers: NO_STORE });
  } catch (error) {
    const appError = isAppError(error)
      ? error
      : error instanceof z.ZodError
        ? new AppError("VALIDATION_ERROR", "Request payload is invalid")
        : error instanceof SyntaxError
          ? new AppError("VALIDATION_ERROR", "Request body is not valid JSON")
          : new AppError("INTERNAL_ERROR", "Unexpected server error");

    logServerEvent(appError.status >= 500 ? "error" : "warn", "admin.login", {
      requestId,
      code: appError.code,
      status: appError.status,
      durationMs: Date.now() - startedAt,
    });

    return errorResponse(appError, requestId);
  }
}
