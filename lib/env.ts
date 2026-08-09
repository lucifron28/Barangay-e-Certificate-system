function parseSmtpPort(value: string | undefined) {
  const raw = value?.trim() || "465";
  if (!/^\d+$/.test(raw)) {
    throw new Error("SMTP_PORT must be a whole number between 1 and 65535.");
  }

  const port = Number(raw);
  if (!Number.isSafeInteger(port) || port < 1 || port > 65535) {
    throw new Error("SMTP_PORT must be a whole number between 1 and 65535.");
  }

  return port;
}

function parseSmtpSecure(value: string | undefined) {
  const raw = value?.trim();
  if (!raw || raw === "true") {
    return true;
  }
  if (raw === "false") {
    return false;
  }

  throw new Error("SMTP_SECURE must be either true or false.");
}

export const env = {
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  databaseProvider: process.env.DATABASE_PROVIDER ?? "sqlite",
  certificateIssuanceMode:
    process.env.CERTIFICATE_ISSUANCE_MODE === "hybrid_physical_original"
      ? ("hybrid_physical_original" as const)
      : ("fully_online_demo" as const),
  emailFrom: process.env.EMAIL_FROM?.trim() ?? "",
  localDemoAdminEmail:
    process.env.LOCAL_DEMO_ADMIN_EMAIL ?? "admin@example.com",
  localDemoAdminPassword:
    process.env.LOCAL_DEMO_ADMIN_PASSWORD ?? "password123",
  localDemoSecret: process.env.LOCAL_DEMO_SECRET ?? "",
  trustProxy: process.env.TRUST_PROXY === "true",
  smtpHost: process.env.SMTP_HOST?.trim() || "smtp.gmail.com",
  smtpPass: process.env.SMTP_PASS ?? "",
  smtpPort: parseSmtpPort(process.env.SMTP_PORT),
  smtpSecure: parseSmtpSecure(process.env.SMTP_SECURE),
  smtpUser: process.env.SMTP_USER?.trim() ?? "",
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

export function hasEmailConfiguration() {
  return Boolean(
    env.smtpHost &&
    env.smtpPort &&
    env.smtpUser &&
    env.smtpPass &&
    env.emailFrom,
  );
}

export function getMissingSupabaseEnv() {
  return [
    ["NEXT_PUBLIC_SUPABASE_URL", env.supabaseUrl],
    ["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", env.supabaseAnonKey],
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name);
}
