import { createHash, timingSafeEqual } from "crypto";
import { SignJWT, jwtVerify } from "jose";

export const ADMIN_SESSION_COOKIE = "fotgs_admin";

const MIN_SECRET_LEN = 16;

function encoderSecret(): Uint8Array | null {
  const s = process.env.AUTH_SECRET?.trim();
  if (!s || s.length < MIN_SECRET_LEN) return null;
  return new TextEncoder().encode(s);
}

export async function signAdminSession(): Promise<string | null> {
  const key = encoderSecret();
  if (!key) return null;
  return new SignJWT({ role: "admin" as const })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(key);
}

export async function verifyAdminSession(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const key = encoderSecret();
  if (!key) return false;
  try {
    const { payload } = await jwtVerify(token, key);
    return (payload as { role?: unknown }).role === "admin";
  } catch {
    return false;
  }
}

function timingSafeEqualStr(a: string, b: string): boolean {
  const hashA = createHash("sha256").update(a).digest();
  const hashB = createHash("sha256").update(b).digest();
  return timingSafeEqual(hashA, hashB);
}

export function adminCredentialsOk(username: string, password: string): boolean {
  const u = process.env.ADMIN_USERNAME?.trim();
  const p = process.env.ADMIN_PASSWORD?.trim();
  if (!u || !p) return false;
  return timingSafeEqualStr(username.trim(), u) && timingSafeEqualStr(password, p);
}

export function authEnvConfigured(): boolean {
  return Boolean(
    process.env.AUTH_SECRET?.trim() &&
      process.env.AUTH_SECRET.trim().length >= MIN_SECRET_LEN &&
      process.env.ADMIN_USERNAME?.trim() &&
      process.env.ADMIN_PASSWORD?.trim()
  );
}
