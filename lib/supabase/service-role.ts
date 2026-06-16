import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import type { Database } from "@/types/database";

export function createServiceRoleClient() {
  if (!env.supabaseUrl || !env.supabaseSecretKey) {
    return null;
  }

  return createSupabaseClient<Database>(
    env.supabaseUrl,
    env.supabaseSecretKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
