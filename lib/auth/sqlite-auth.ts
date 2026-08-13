import "server-only";

import { cookies } from "next/headers";
import { createHmac, randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { env, hasSessionCookieSecret } from "@/lib/env";
import {
  createActivityLog,
  createAuthSession,
  findProfileByLogin,
  getAuthSessionProfileByTokenHash,
  revokeAuthSession,
  touchAuthSession,
} from "@/lib/db/queries";
import type { Profile } from "@/types/database";

const COOKIE_NAME = "barangay_bato_session";
const SESSION_TTL_SECONDS = 60 * 60 * 8;

export function hasLocalDemoSecret() {
  return hasSessionCookieSecret();
}

function tokenHash(token: string) {
  const secret = env.sessionCookieSecret || env.localDemoSecret;
  return createHmac("sha256", secret).update(token).digest("hex");
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

export function verifyPassword(password: string, storedHash: string | null) {
  if (!storedHash) return false;
  const [algorithm, salt, hash] = storedHash.split("$");
  if (algorithm !== "scrypt" || !salt || !hash) return false;
  const computed = Buffer.from(scryptSync(password, salt, 64).toString("hex"));
  const expected = Buffer.from(hash);
  return computed.length === expected.length && timingSafeEqual(computed, expected);
}

export async function createLocalSession(profile: Profile) {
  if (!hasLocalDemoSecret()) {
    throw new Error("SESSION_COOKIE_SECRET or LOCAL_DEMO_SECRET must be configured for local auth.");
  }
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000).toISOString();
  await createAuthSession({
    expires_at: expiresAt,
    id: randomUUID(),
    profile_id: profile.id,
    token_hash: tokenHash(token),
  });
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    maxAge: SESSION_TTL_SECONDS,
    path: "/",
    sameSite: "lax",
    secure: env.appUrl.startsWith("https://"),
  });
}

export async function clearLocalSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (token) await revokeAuthSession(tokenHash(token));
  cookieStore.delete(COOKIE_NAME);
}

export async function getLocalSessionProfile() {
  if (!hasLocalDemoSecret()) return null;
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token || !/^[A-Za-z0-9_-]{32,}$/.test(token)) return null;
  const hash = tokenHash(token);
  const profile = await getAuthSessionProfileByTokenHash(hash);
  if (profile) await touchAuthSession(hash);
  return profile;
}

export async function authenticateLocalUser(login: string, password: string) {
  const profile = await findProfileByLogin(login);
  if (!profile || !verifyPassword(password, profile.password_hash)) return null;
  await createActivityLog({
    action: "Login",
    affected_record_id: profile.id,
    affected_table: "profiles",
    profile,
    remarks: "Application session login.",
  });
  return profile;
}
