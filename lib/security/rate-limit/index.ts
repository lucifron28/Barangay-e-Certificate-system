import "server-only";

import { headers } from "next/headers";
import { env } from "@/lib/env";
import { isSqliteProvider } from "@/lib/db/provider";
import { clearSqliteRateLimit, consumeSqliteRateLimit } from "./sqlite";
import { consumeSupabaseRateLimit } from "./supabase";
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

  // Forwarding headers are ignored unless a known reverse proxy is configured.
  return forwarded || requestHeaders.get("user-agent") || "local-demo";
}

export async function consumeRateLimit(action: RateLimitAction, identifier: string) {
  const fingerprint = await clientFingerprint();

  if (!isSqliteProvider()) {
    return consumeSupabaseRateLimit();
  }

  return consumeSqliteRateLimit(action, identifier, fingerprint, POLICIES[action]);
}

export async function clearRateLimit(action: RateLimitAction, identifier: string) {
  if (!isSqliteProvider()) {
    return;
  }

  clearSqliteRateLimit(action, identifier, await clientFingerprint());
}

export type { RateLimitAction, RateLimitResult } from "./types";
