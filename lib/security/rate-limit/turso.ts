import "server-only";

import { createHash } from "node:crypto";
import { getTursoDb } from "@/lib/db/turso/client";
import type { RateLimitAction, RateLimitPolicy, RateLimitResult } from "./types";

function hashKey(action: RateLimitAction, identifier: string, clientFingerprint: string) {
  return createHash("sha256")
    .update(`${action}:${identifier.trim().toLowerCase()}:${clientFingerprint}`)
    .digest("hex");
}

export async function consumeTursoRateLimit(
  action: RateLimitAction,
  identifier: string,
  clientFingerprint: string,
  policy: RateLimitPolicy,
): Promise<RateLimitResult> {
  const keyHash = hashKey(action, identifier, clientFingerprint);
  const now = Date.now();
  const db = getTursoDb();
  const execute = db.transactionAsync(async (tx) => {
    const row = (await tx.get(
      "SELECT window_started_at, attempts FROM rate_limit_attempts WHERE key_hash = ?",
      keyHash,
    )) as { attempts: number; window_started_at: string } | undefined;
    const windowStartedAt = row ? new Date(row.window_started_at).getTime() : now;
    const windowExpired =
      !row || Number.isNaN(windowStartedAt) || now - windowStartedAt >= policy.windowMs;
    const attempts = windowExpired ? 1 : row.attempts + 1;
    const persistedWindowStart = windowExpired
      ? new Date(now).toISOString()
      : row.window_started_at;
    await tx.run(
      `INSERT INTO rate_limit_attempts (key_hash, action, window_started_at, attempts, updated_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(key_hash) DO UPDATE SET
         window_started_at = excluded.window_started_at,
         attempts = excluded.attempts,
         updated_at = excluded.updated_at`,
      keyHash,
      action,
      persistedWindowStart,
      attempts,
      new Date(now).toISOString(),
    );
    return Math.max(
      1,
      Math.ceil(
        (new Date(persistedWindowStart).getTime() + policy.windowMs - now) / 1000,
      ),
    );
  });
  const retryAfterSeconds = await execute();
  const current = await db.get(
    "SELECT attempts FROM rate_limit_attempts WHERE key_hash = ?",
    keyHash,
  );
  const attempts = Number((current as { attempts?: number } | undefined)?.attempts ?? policy.limit + 1);
  return { allowed: attempts <= policy.limit, retryAfterSeconds };
}

export async function clearTursoRateLimit(
  action: RateLimitAction,
  identifier: string,
  clientFingerprint: string,
) {
  await getTursoDb().run(
    "DELETE FROM rate_limit_attempts WHERE key_hash = ?",
    hashKey(action, identifier, clientFingerprint),
  );
}
