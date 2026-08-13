/* global process, console */

const errors = [];

if (process.env.DATABASE_PROVIDER !== "turso") {
  errors.push("DATABASE_PROVIDER must be turso for production.");
}
if (!process.env.TURSO_DATABASE_URL) errors.push("TURSO_DATABASE_URL is required.");
if (!process.env.TURSO_AUTH_TOKEN) errors.push("TURSO_AUTH_TOKEN is required.");
if (process.env.CERTIFICATE_STORAGE_PROVIDER !== "vercel_blob") {
  errors.push("CERTIFICATE_STORAGE_PROVIDER must be vercel_blob for production.");
}
if (!process.env.BLOB_READ_WRITE_TOKEN) errors.push("BLOB_READ_WRITE_TOKEN is required.");
if ((process.env.SESSION_COOKIE_SECRET ?? "").length < 32) {
  errors.push("SESSION_COOKIE_SECRET must be at least 32 characters.");
}
if (!(process.env.NEXT_PUBLIC_APP_URL ?? "").startsWith("https://")) {
  errors.push("NEXT_PUBLIC_APP_URL must use HTTPS for production.");
}
if (!process.env.SMTP_USER) errors.push("SMTP_USER is required for production notifications.");
if (!process.env.SMTP_PASS) errors.push("SMTP_PASS is required for production notifications.");
if (!process.env.EMAIL_FROM) errors.push("EMAIL_FROM is required for production notifications.");

if (errors.length) {
  console.error("Production environment is not ready:");
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log("Production environment checks passed without printing secret values.");
}
