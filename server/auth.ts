import { createHash, timingSafeEqual } from "node:crypto";

export const PASSWORD_HEADER = "x-app-password";

// Header values arrive with surrounding whitespace stripped, so the configured password is trimmed too.
const configuredPassword = () => process.env.APP_PASSWORD?.trim() || undefined;

export function passwordEnabled(): boolean {
  return Boolean(configuredPassword());
}

/** True when no password is configured, or the request carries the right one. */
export function isAuthorized(req: Request): boolean {
  const expected = configuredPassword();
  if (!expected) return true;
  const given = req.headers.get(PASSWORD_HEADER)?.trim() ?? "";
  // Compare fixed-length hashes so the check takes the same time whatever was typed.
  const a = createHash("sha256").update(given).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}
