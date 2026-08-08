export const env = {
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  databaseProvider: process.env.DATABASE_PROVIDER ?? "sqlite",
  certificateIssuanceMode:
    process.env.CERTIFICATE_ISSUANCE_MODE === "hybrid_physical_original"
      ? ("hybrid_physical_original" as const)
      : ("fully_online_demo" as const),
  emailFrom: process.env.EMAIL_FROM ?? "",
  localDemoAdminEmail:
    process.env.LOCAL_DEMO_ADMIN_EMAIL ?? "admin@example.com",
  localDemoAdminPassword:
    process.env.LOCAL_DEMO_ADMIN_PASSWORD ?? "password123",
  localDemoSecret: process.env.LOCAL_DEMO_SECRET ?? "",
  trustProxy: process.env.TRUST_PROXY === "true",
  resendApiKey: process.env.RESEND_API_KEY ?? "",
  sqliteDatabaseUrl:
    process.env.SQLITE_DATABASE_URL ?? "file:./data/dev.sqlite",
  supabaseAnonKey:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    "",
  supabaseSecretKey:
    process.env.SUPABASE_SECRET_KEY ??
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    "",
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
};

export function hasSupabaseEnv() {
  return Boolean(env.supabaseUrl && env.supabaseAnonKey);
}

export function isSupabaseMode() {
  return env.databaseProvider === "supabase";
}

export function isSqliteMode() {
  return env.databaseProvider !== "supabase";
}

export function getMissingSupabaseEnv() {
  return [
    ["NEXT_PUBLIC_SUPABASE_URL", env.supabaseUrl],
    ["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", env.supabaseAnonKey],
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name);
}
