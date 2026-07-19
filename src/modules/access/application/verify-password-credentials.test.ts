import { describe, expect, it } from "vitest";

import { verifyPasswordCredentials } from "./verify-password-credentials";

describe("verifyPasswordCredentials", () => {
  it("accepts matching username and password", () => {
    expect(
      verifyPasswordCredentials({
        username: "admin",
        password: "secret-pass",
        expectedUsername: "admin",
        expectedPassword: "secret-pass",
      }),
    ).toBe(true);
  });

  it("rejects a wrong password", () => {
    expect(
      verifyPasswordCredentials({
        username: "admin",
        password: "wrong",
        expectedUsername: "admin",
        expectedPassword: "secret-pass",
      }),
    ).toBe(false);
  });

  it("rejects a wrong username", () => {
    expect(
      verifyPasswordCredentials({
        username: "other",
        password: "secret-pass",
        expectedUsername: "admin",
        expectedPassword: "secret-pass",
      }),
    ).toBe(false);
  });
});
