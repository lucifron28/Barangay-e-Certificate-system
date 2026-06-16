"use client";

import { createBrowserClient } from "@supabase/ssr";
import { env, hasSupabaseEnv } from "@/lib/env";
import type { Database } from "@/types/database";

export function createClient() {
  if (!hasSupabaseEnv()) {
    throw new Error("Supabase browser environment variables are not configured.");
  }

  return createBrowserClient<Database>(env.supabaseUrl, env.supabaseAnonKey);
}
