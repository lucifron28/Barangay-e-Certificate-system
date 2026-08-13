import { env } from "@/lib/env";

export type DatabaseProvider = "sqlite" | "supabase" | "turso";

export function getDatabaseProvider(): DatabaseProvider {
  if (env.databaseProvider === "supabase") return "supabase";
  if (env.databaseProvider === "turso") return "turso";
  return "sqlite";
}

export function isSqliteProvider() {
  // Kept for existing action call sites: this means the provider-neutral
  // repository path (SQLite or Turso), not native SQLite specifically.
  return getDatabaseProvider() !== "supabase";
}

export function isLocalSqliteProvider() {
  return getDatabaseProvider() === "sqlite";
}

export function isSupabaseProvider() {
  return getDatabaseProvider() === "supabase";
}

export function isTursoProvider() {
  return getDatabaseProvider() === "turso";
}
