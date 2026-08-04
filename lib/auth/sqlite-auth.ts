import "server-only";

import { cookies } from "next/headers";
import {
  createHmac,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import { env } from "@/lib/env";
import {
  createActivityLog,
  findProfileByLogin,
  getProfileById,
} from "@/lib/db/sqlite/queries";
import type { Profile } from "@/types/database";

const COOKIE_NAME = "barangay_bato_demo_session";
const SESSION_TTL_SECONDS = 60 * 60 * 8;

export function hasLocalDemoSecret() {
  return env.localDemoSecret.trim().length >= 32;
}

function secret() {
  if (!hasLocalDemoSecret()) {
    throw new Error("LOCAL_DEMO_SECRET must be configured for SQLite demo auth.");
  }

  return env.localDemoSecret;
}

function base64Url(value: string) {
  return Buffer.from(value).toString("base64url");
}

function fromBase64Url(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

function hasValidSignature(payload: string, providedSignature: string) {
  if (!/^[A-Za-z0-9_-]+$/.test(providedSignature)) {
    return false;
  }

  try {
    const expected = Buffer.from(sign(payload), "base64url");
    const provided = Buffer.from(providedSignature, "base64url");

    return (
      expected.length === provided.length && timingSafeEqual(expected, provided)
    );
  } catch {
    return false;
  }
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

export function verifyPassword(password: string, storedHash: string | null) {
  if (!storedHash) {
    return false;
  }

  const [algorithm, salt, hash] = storedHash.split("$");
  if (algorithm !== "scrypt" || !salt || !hash) {
    return false;
  }

  const computed = Buffer.from(scryptSync(password, salt, 64).toString("hex"));
  const expected = Buffer.from(hash);

  return (
    computed.length === expected.length && timingSafeEqual(computed, expected)
  );
}

export async function createLocalSession(profile: Profile) {
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const payload = base64Url(
    JSON.stringify({
      exp: expiresAt,
      profileId: profile.id,
    }),
  );
  const token = `${payload}.${sign(payload)}`;
  const cookieStore = await cookies();

  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    maxAge: SESSION_TTL_SECONDS,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

export async function clearLocalSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getLocalSessionProfile() {
  if (!hasLocalDemoSecret()) {
    return null;
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  const [payload, signature] = token.split(".");
  if (!payload || !signature || !hasValidSignature(payload, signature)) {
    return null;
  }

  try {
    const parsed = JSON.parse(fromBase64Url(payload)) as {
      exp?: number;
      profileId?: string;
    };

    if (!parsed.profileId || !parsed.exp || parsed.exp < Date.now() / 1000) {
      return null;
    }

    return getProfileById(parsed.profileId);
  } catch {
    return null;
  }
}

export function authenticateLocalUser(login: string, password: string) {
  const profile = findProfileByLogin(login);

  if (!profile || !verifyPassword(password, profile.password_hash)) {
    return null;
  }

  createActivityLog({
    action: "Login",
    affected_record_id: profile.id,
    affected_table: "profiles",
    profile,
    remarks: "Local demo auth login.",
  });

  return profile;
}
