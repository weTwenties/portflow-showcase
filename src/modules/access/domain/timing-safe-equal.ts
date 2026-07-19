import { timingSafeEqual } from "node:crypto";

/**
 * Constant-time string compare. Different lengths still run a dummy compare
 * so callers cannot probe length via early return timing.
 */
export function timingSafeEqualString(left: string, right: string): boolean {
  const leftBuf = Buffer.from(left);
  const rightBuf = Buffer.from(right);

  if (leftBuf.length !== rightBuf.length) {
    timingSafeEqual(leftBuf, Buffer.alloc(leftBuf.length));
    return false;
  }

  return timingSafeEqual(leftBuf, rightBuf);
}
