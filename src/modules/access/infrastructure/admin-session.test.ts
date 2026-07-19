import { describe, expect, it } from "vitest";

import {
  signAdminSession,
  verifyAdminSession,
} from "@/modules/access/infrastructure/admin-session";

const SECRET = "0123456789abcdef0123456789abcdef";

describe("admin session", () => {
  it("round-trips a signed session", async () => {
    const token = await signAdminSession(
      { username: "admin", email: "owner@example.com" },
      SECRET,
    );

    await expect(verifyAdminSession(token, SECRET)).resolves.toEqual({
      username: "admin",
      email: "owner@example.com",
    });
  });

  it("rejects a token signed with a different secret", async () => {
    const token = await signAdminSession(
      { username: "admin", email: "owner@example.com" },
      SECRET,
    );

    await expect(
      verifyAdminSession(token, "ffffffffffffffffffffffffffffffff"),
    ).rejects.toThrow();
  });
});
