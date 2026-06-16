import { env } from "@/lib/env";

export type DatabaseProvider = "sqlite" | "supabase";

export function getDatabaseProvider(): DatabaseProvider {
  return env.databaseProvider === "supabase" ? "supabase" : "sqlite";
}

export function isSqliteProvider() {
  return getDatabaseProvider() === "sqlite";
}

export function isSupabaseProvider() {
  return getDatabaseProvider() === "supabase";
}
