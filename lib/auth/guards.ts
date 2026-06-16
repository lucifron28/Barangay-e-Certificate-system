import { redirect } from "next/navigation";
import { getMissingSupabaseEnv } from "@/lib/env";
import { getDatabaseProvider } from "@/lib/db/provider";
import { getLocalSessionProfile } from "@/lib/auth/sqlite-auth";
import { isAdminRole } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/database";

export type AuthContext =
  | {
      setupMissing: true;
      missingEnv: string[];
      profile: null;
      supabase: null;
      provider: "supabase";
    }
  | {
      setupMissing: false;
      missingEnv: [];
      profile: Profile | null;
      supabase: NonNullable<Awaited<ReturnType<typeof createClient>>> | null;
      provider: "sqlite" | "supabase";
    };

export async function getAuthContext(): Promise<AuthContext> {
  if (getDatabaseProvider() === "sqlite") {
    return {
      missingEnv: [],
      profile: await getLocalSessionProfile(),
      provider: "sqlite",
      setupMissing: false,
      supabase: null,
    };
  }

  const supabase = await createClient();

  if (!supabase) {
    return {
      setupMissing: true,
      missingEnv: getMissingSupabaseEnv(),
      profile: null,
      provider: "supabase",
      supabase: null,
    };
  }

  const { data, error } = await supabase.auth.getClaims();
  const authUserId = data?.claims?.sub;

  if (error || !authUserId) {
    return {
      setupMissing: false,
      missingEnv: [],
      profile: null,
      provider: "supabase",
      supabase,
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  return {
    setupMissing: false,
    missingEnv: [],
    profile: profile ?? null,
    provider: "supabase",
    supabase,
  };
}

export async function requireResident() {
  const context = await getAuthContext();

  if (context.setupMissing) {
    return context;
  }

  if (!context.profile) {
    redirect("/login?error=Please log in to continue.");
  }

  if (isAdminRole(context.profile.role)) {
    redirect("/admin/dashboard");
  }

  return {
    ...context,
    profile: context.profile,
  };
}

export async function requireAdmin() {
  const context = await getAuthContext();

  if (context.setupMissing) {
    return context;
  }

  if (!context.profile) {
    redirect("/login?error=Please log in to continue.");
  }

  if (!isAdminRole(context.profile.role)) {
    redirect("/resident/dashboard");
  }

  return {
    ...context,
    profile: context.profile,
  };
}
