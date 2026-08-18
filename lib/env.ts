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
  tursoAuthToken: process.env.TURSO_AUTH_TOKEN?.trim() ?? "",
  tursoDatabaseUrl: process.env.TURSO_DATABASE_URL?.trim() ?? "",
  certificateStorageProvider:
    process.env.CERTIFICATE_STORAGE_PROVIDER === "vercel_blob"
      ? ("vercel_blob" as const)
      : ("local" as const),
  blobReadWriteToken: process.env.BLOB_READ_WRITE_TOKEN?.trim() ?? "",
  sessionCookieSecret: process.env.SESSION_COOKIE_SECRET?.trim() ?? "",
  emailFrom: process.env.EMAIL_FROM?.trim() ?? "",
  localDemoAdminEmail:
    process.env.LOCAL_DEMO_ADMIN_EMAIL?.trim() || "admin@example.com",
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
  return env.databaseProvider === "sqlite";
}

export function isTursoMode() {
  return env.databaseProvider === "turso";
}

export function hasTursoEnv() {
  return Boolean(env.tursoDatabaseUrl && env.tursoAuthToken);
}

export function hasSessionCookieSecret() {
  return (env.sessionCookieSecret || env.localDemoSecret).length >= 32;
}

export function getProductionEnvErrors() {
  const errors: string[] = [];
  if (env.databaseProvider !== "turso") {
    errors.push("DATABASE_PROVIDER must be turso for production.");
  }
  if (!env.tursoDatabaseUrl) errors.push("TURSO_DATABASE_URL is required.");
  if (!env.tursoAuthToken) errors.push("TURSO_AUTH_TOKEN is required.");
  if (env.certificateStorageProvider !== "vercel_blob") {
    errors.push("CERTIFICATE_STORAGE_PROVIDER must be vercel_blob for production.");
  }
  if (!env.blobReadWriteToken) errors.push("BLOB_READ_WRITE_TOKEN is required.");
  if (!env.sessionCookieSecret || env.sessionCookieSecret.length < 32) {
    errors.push("SESSION_COOKIE_SECRET must be at least 32 characters.");
  }
  if (!env.appUrl.startsWith("https://")) {
    errors.push("NEXT_PUBLIC_APP_URL must use HTTPS for production.");
  }
  if (!env.smtpUser) errors.push("SMTP_USER is required for production notifications.");
  if (!env.smtpPass) errors.push("SMTP_PASS is required for production notifications.");
  if (!env.emailFrom) errors.push("EMAIL_FROM is required for production notifications.");
  return errors;
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
