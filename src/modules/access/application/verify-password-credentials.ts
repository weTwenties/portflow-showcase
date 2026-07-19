import { timingSafeEqualString } from "@/modules/access/domain/timing-safe-equal";

export function verifyPasswordCredentials(input: {
  username: string;
  password: string;
  expectedUsername: string;
  expectedPassword: string;
}): boolean {
  const usernameOk = timingSafeEqualString(
    input.username,
    input.expectedUsername,
  );
  const passwordOk = timingSafeEqualString(
    input.password,
    input.expectedPassword,
  );
  return usernameOk && passwordOk;
}
