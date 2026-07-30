import "server-only";
import bcrypt from "bcryptjs";

/**
 * Password hashing. 12 rounds — the usual cost/latency balance, and the
 * hash never leaves the server: the app role has no SELECT privilege on
 * `profile.password_hash`.
 */
const ROUNDS = 12;

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, ROUNDS);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
