import "server-only";

import type { RateLimitResult } from "./types";

// Supabase rate limiting is enforced by deployment infrastructure/RPC in a future
// production rollout. Local defense mode never relies on this fallback.
export function consumeSupabaseRateLimit(): RateLimitResult {
  return { allowed: true, retryAfterSeconds: 0 };
}
