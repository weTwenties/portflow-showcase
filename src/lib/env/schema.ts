import { z } from "zod";

export const APP_ENVS = ["development", "preview", "production"] as const;
export const ADMIN_AUTH_MODES = ["cloudflare_access", "password"] as const;

const booleanFlag = z
  .enum(["true", "false"])
  .default("false")
  .transform((value) => value === "true");

function parseAudienceTags(value: string): Set<string> {
  return new Set(
    value
      .split(",")
      .map((aud) => aud.trim())
      .filter((aud) => aud.length > 0),
  );
}

export const serverEnvSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),

    // App
    NEXT_PUBLIC_APP_URL: z.url(),
    APP_ENV: z.enum(APP_ENVS).default("development"),

    // Single admin
    ADMIN_EMAIL: z.string().trim().toLowerCase().pipe(z.email()),
    ADMIN_AUTH_MODE: z.enum(ADMIN_AUTH_MODES).default("cloudflare_access"),
    // Required when ADMIN_AUTH_MODE=cloudflare_access (validated in superRefine).
    CF_ACCESS_TEAM_DOMAIN: z.string().trim().default(""),
    CF_ACCESS_AUDS: z.string().default("").transform(parseAudienceTags),
    // Required when ADMIN_AUTH_MODE=password (validated in superRefine).
    ADMIN_USERNAME: z.string().default(""),
    ADMIN_PASSWORD: z.string().default(""),
    DEV_ADMIN_BYPASS: booleanFlag,

    // Cloudflare R2
    R2_ACCOUNT_ID: z.string().min(1),
    R2_ACCESS_KEY_ID: z.string().min(1),
    R2_SECRET_ACCESS_KEY: z.string().min(1),
    R2_PRIVATE_BUCKET: z.string().min(1),
    R2_PUBLIC_BUCKET: z.string().min(1),
    R2_PUBLIC_BASE_URL: z.url(),

    // Upload finalization (+ admin session signing in password mode)
    UPLOAD_TOKEN_SECRET: z.string().min(32, {
      message: "Must be at least 32 characters",
    }),
  })
  .superRefine((env, ctx) => {
    if (env.DEV_ADMIN_BYPASS && env.NODE_ENV !== "development") {
      ctx.addIssue({
        code: "custom",
        path: ["DEV_ADMIN_BYPASS"],
        message: "DEV_ADMIN_BYPASS=true is only allowed when NODE_ENV=development",
      });
    }

    if (env.DEV_ADMIN_BYPASS && env.APP_ENV !== "development") {
      ctx.addIssue({
        code: "custom",
        path: ["DEV_ADMIN_BYPASS"],
        message: "DEV_ADMIN_BYPASS=true is not allowed in Preview or Production",
      });
    }

    if (env.ADMIN_AUTH_MODE === "cloudflare_access") {
      if (!env.CF_ACCESS_TEAM_DOMAIN) {
        ctx.addIssue({
          code: "custom",
          path: ["CF_ACCESS_TEAM_DOMAIN"],
          message: "Required when ADMIN_AUTH_MODE=cloudflare_access",
        });
      } else if (env.CF_ACCESS_TEAM_DOMAIN.includes("/")) {
        ctx.addIssue({
          code: "custom",
          path: ["CF_ACCESS_TEAM_DOMAIN"],
          message: "Must be a bare domain like team-name.cloudflareaccess.com",
        });
      }

      if (env.CF_ACCESS_AUDS.size === 0) {
        ctx.addIssue({
          code: "custom",
          path: ["CF_ACCESS_AUDS"],
          message: "Must contain at least one Access application audience tag",
        });
      }
    }

    if (env.ADMIN_AUTH_MODE === "password") {
      if (!env.ADMIN_USERNAME.trim()) {
        ctx.addIssue({
          code: "custom",
          path: ["ADMIN_USERNAME"],
          message: "Required when ADMIN_AUTH_MODE=password",
        });
      }

      if (env.ADMIN_PASSWORD.length < 8) {
        ctx.addIssue({
          code: "custom",
          path: ["ADMIN_PASSWORD"],
          message: "Must be at least 8 characters when ADMIN_AUTH_MODE=password",
        });
      }
    }
  });

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export class EnvValidationError extends Error {
  readonly issues: ReadonlyArray<{ path: string; message: string }>;

  constructor(issues: ReadonlyArray<{ path: string; message: string }>) {
    // Only variable names and rule messages — never values, which may be secrets.
    super(
      `Invalid environment configuration: ${issues
        .map((issue) => `${issue.path}: ${issue.message}`)
        .join("; ")}`,
    );
    this.name = "EnvValidationError";
    this.issues = issues;
  }
}

export function parseServerEnv(
  source: Record<string, string | undefined>,
): ServerEnv {
  const result = serverEnvSchema.safeParse(source);

  if (!result.success) {
    throw new EnvValidationError(
      result.error.issues.map((issue) => ({
        path: issue.path.join(".") || "(root)",
        message: issue.message,
      })),
    );
  }

  return result.data;
}
