import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { parse } from "cookie";
import { jwtVerify, SignJWT } from "jose";
import { createCredentialUser, getCredentialUserByEmail, getUserById, touchCredentialUser } from "./db";
import { ENV } from "./_core/env";

const scrypt = promisify(scryptCallback);
const sessionKey = new TextEncoder().encode(ENV.cookieSecret || "development-only-session-secret");
const PASSWORD_MIN_LENGTH = 8;
export const CREDENTIAL_SESSION_COOKIE = "cv_studio_session";
export const CREDENTIAL_SESSION_MAX_AGE = 60 * 60 * 24 * 7;

export function assertPassword(password: string) {
  if (password.length < PASSWORD_MIN_LENGTH || password.length > 128) throw new Error("Password must be between 8 and 128 characters.");
}

export async function hashPassword(password: string) {
  assertPassword(password);
  const salt = randomBytes(16).toString("hex");
  const derived = await scrypt(password, salt, 64) as Buffer;
  return `scrypt$${salt}$${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [scheme, salt, hash] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  const derived = await scrypt(password, salt, 64) as Buffer;
  const expected = Buffer.from(hash, "hex");
  return expected.length === derived.length && timingSafeEqual(expected, derived);
}

export async function issueCredentialSession(userId: number, maxAgeSeconds = CREDENTIAL_SESSION_MAX_AGE) {
  return new SignJWT({ type: "credentials" }).setProtectedHeader({ alg: "HS256" }).setSubject(String(userId)).setIssuedAt().setExpirationTime(`${maxAgeSeconds}s`).setJti(createHash("sha256").update(randomBytes(24)).digest("hex")).sign(sessionKey);
}

export async function getCredentialSessionUser(req: { headers: { cookie?: string } }) {
  return getUserForSessionToken(parse(req.headers.cookie ?? "")[CREDENTIAL_SESSION_COOKIE]);
}

/** Resolves a session token (web cookie or mobile `Authorization: Bearer`) to its user. */
export async function getUserForSessionToken(token: string | undefined) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, sessionKey, { algorithms: ["HS256"] });
    if (payload.type !== "credentials" || !payload.sub || !/^\d+$/.test(payload.sub)) return null;
    return (await getUserById(Number(payload.sub))) ?? null;
  } catch {
    return null;
  }
}

export async function registerCredentialAccount(input: { name: string; email: string; password: string }) {
  const email = input.email.trim().toLowerCase();
  const name = input.name.trim();
  if (!name || name.length > 120) throw new Error("Please enter your name.");
  assertPassword(input.password);
  const existing = await getCredentialUserByEmail(email);
  if (existing) throw new Error("An account already exists for this email address.");
  const passwordHash = await hashPassword(input.password);
  return createCredentialUser({ openId: `credentials_${randomBytes(18).toString("hex")}`, name, email, passwordHash });
}

export async function authenticateCredentialAccount(input: { email: string; password: string }) {
  const found = await getCredentialUserByEmail(input.email.trim().toLowerCase());
  if (!found || !(await verifyPassword(input.password, found.credential.passwordHash))) return null;
  await touchCredentialUser(found.user.id);
  return found.user;
}
