import "server-only";

import { headers } from "next/headers";
import { env } from "@/lib/env";
import { getDatabaseProvider } from "@/lib/db/provider";
import type { RateLimitAction, RateLimitPolicy } from "./types";

const POLICIES: Record<RateLimitAction, RateLimitPolicy> = {
  login: { limit: 5, windowMs: 15 * 60 * 1000 },
  registration: { limit: 5, windowMs: 60 * 60 * 1000 },
  verification: { limit: 30, windowMs: 10 * 60 * 1000 },
};

async function clientFingerprint() {
  const requestHeaders = await headers();
  const forwarded = env.trustProxy
    ? requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim()
    : null;
  return forwarded || requestHeaders.get("user-agent") || "local-demo";
}

export async function consumeRateLimit(action: RateLimitAction, identifier: string) {
  const fingerprint = await clientFingerprint();
  const provider = getDatabaseProvider();
  if (provider === "supabase") {
    const { consumeSupabaseRateLimit } = await import("./supabase");
    return consumeSupabaseRateLimit();
  }
  if (provider === "turso") {
    const { consumeTursoRateLimit } = await import("./turso");
    return consumeTursoRateLimit(action, identifier, fingerprint, POLICIES[action]);
  }
  const { consumeSqliteRateLimit } = await import("./sqlite");
  return consumeSqliteRateLimit(action, identifier, fingerprint, POLICIES[action]);
}

export async function clearRateLimit(action: RateLimitAction, identifier: string) {
  const provider = getDatabaseProvider();
  if (provider === "supabase") return;
  const fingerprint = await clientFingerprint();
  if (provider === "turso") {
    const { clearTursoRateLimit } = await import("./turso");
    await clearTursoRateLimit(action, identifier, fingerprint);
    return;
  }
  const { clearSqliteRateLimit } = await import("./sqlite");
  clearSqliteRateLimit(action, identifier, fingerprint);
}

export type { RateLimitAction, RateLimitResult } from "./types";
