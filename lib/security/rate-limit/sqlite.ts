import "server-only";

import { createHash } from "node:crypto";
import { getSqliteDb } from "@/lib/db/sqlite/client";
import type { RateLimitAction, RateLimitPolicy, RateLimitResult } from "./types";

function hashKey(action: RateLimitAction, identifier: string, clientFingerprint: string) {
  return createHash("sha256")
    .update(`${action}:${identifier.trim().toLowerCase()}:${clientFingerprint}`)
    .digest("hex");
}

export function consumeSqliteRateLimit(
  action: RateLimitAction,
  identifier: string,
  clientFingerprint: string,
  policy: RateLimitPolicy,
): RateLimitResult {
  const keyHash = hashKey(action, identifier, clientFingerprint);
  const now = Date.now();
  const db = getSqliteDb();
  const row = db
    .prepare("SELECT window_started_at, attempts FROM rate_limit_attempts WHERE key_hash = ?")
    .get(keyHash) as { attempts: number; window_started_at: string } | undefined;

  const windowStartedAt = row ? new Date(row.window_started_at).getTime() : now;
  const windowExpired = !row || Number.isNaN(windowStartedAt) || now - windowStartedAt >= policy.windowMs;
  const attempts = windowExpired ? 1 : row.attempts + 1;
  const persistedWindowStart = windowExpired ? new Date(now).toISOString() : row.window_started_at;

  db.prepare(
    `INSERT INTO rate_limit_attempts (key_hash, action, window_started_at, attempts, updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(key_hash) DO UPDATE SET
       window_started_at = excluded.window_started_at,
       attempts = excluded.attempts,
       updated_at = excluded.updated_at`,
  ).run(keyHash, action, persistedWindowStart, attempts, new Date(now).toISOString());

  const retryAfterSeconds = Math.max(
    1,
    Math.ceil((new Date(persistedWindowStart).getTime() + policy.windowMs - now) / 1000),
  );

  return {
    allowed: attempts <= policy.limit,
    retryAfterSeconds,
  };
}

export function clearSqliteRateLimit(
  action: RateLimitAction,
  identifier: string,
  clientFingerprint: string,
) {
  getSqliteDb()
    .prepare("DELETE FROM rate_limit_attempts WHERE key_hash = ?")
    .run(hashKey(action, identifier, clientFingerprint));
}
