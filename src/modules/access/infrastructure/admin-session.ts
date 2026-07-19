import { SignJWT, jwtVerify } from "jose";

export const ADMIN_SESSION_COOKIE = "portflow_admin_session";

/** Session lifetime for password-mode admin cookies. */
export const ADMIN_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export type AdminSessionClaims = {
  username: string;
  email: string;
};

function secretKey(secret: string): Uint8Array {
  return new TextEncoder().encode(secret);
}

export async function signAdminSession(
  claims: AdminSessionClaims,
  secret: string,
): Promise<string> {
  return new SignJWT({
    username: claims.username,
    email: claims.email,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(claims.username)
    .setIssuedAt()
    .setExpirationTime(`${ADMIN_SESSION_MAX_AGE_SECONDS}s`)
    .sign(secretKey(secret));
}

export async function verifyAdminSession(
  token: string,
  secret: string,
): Promise<AdminSessionClaims> {
  const { payload } = await jwtVerify(token, secretKey(secret), {
    algorithms: ["HS256"],
  });

  const username =
    typeof payload.username === "string"
      ? payload.username
      : typeof payload.sub === "string"
        ? payload.sub
        : "";
  const email = typeof payload.email === "string" ? payload.email : "";

  if (!username || !email) {
    throw new Error("Admin session is missing required claims");
  }

  return { username, email };
}

export function adminSessionCookieOptions(secure: boolean) {
  return {
    httpOnly: true,
    secure,
    sameSite: "lax" as const,
    path: "/",
    maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
  };
}
