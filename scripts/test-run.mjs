import { spawnSync } from "node:child_process";
import { Buffer } from "node:buffer";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const npmBin = process.platform === "win32" ? ".\\node_modules\\.bin\\tsx.cmd" : "node_modules/.bin/tsx";
const vitestBin = process.platform === "win32" ? ".\\node_modules\\.bin\\vitest.cmd" : "node_modules/.bin/vitest";
const env = {
  ...process.env,
  NODE_ENV: "test",
  DATABASE_PROVIDER: "sqlite",
  CERTIFICATE_STORAGE_DIRECTORY: "data/certificates-test",
  SIGNATURE_STORAGE_DIRECTORY: "data/signatures-test",
  DEMO_VERIFICATION_SAMPLES_PATH: "data/test-verification-samples.json",
  SQLITE_DATABASE_URL: "file:./data/test.sqlite",
  SMTP_USER: "",
  SMTP_PASS: "",
  EMAIL_FROM: "",
  TURSO_DATABASE_URL: "",
  TURSO_AUTH_TOKEN: "",
  BLOB_READ_WRITE_TOKEN: "",
  NEXT_PUBLIC_SUPABASE_URL: "",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "",
  SUPABASE_SECRET_KEY: "",
  SUPABASE_SERVICE_ROLE_KEY: "",
  SESSION_COOKIE_SECRET: "test-session-cookie-secret-that-is-long-enough",
  LOCAL_DEMO_SECRET: "test-local-demo-secret-that-is-long-enough",
  LOCAL_DEMO_ADMIN_PASSWORD: "local-seed-key-2026-strong",
  CERTIFICATE_STORAGE_PROVIDER: "local",
};

const signatureDirectory = path.resolve(process.cwd(), env.SIGNATURE_STORAGE_DIRECTORY);
mkdirSync(signatureDirectory, { recursive: true });
writeFileSync(
  path.join(signatureDirectory, "test-signer.png"),
  Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
    "base64",
  ),
);

let exitCode;
try {
  const reset = spawnSync(
    npmBin,
    ["--tsconfig", "scripts/tsconfig.json", "scripts/demo-reset.ts"],
    {
      env,
      shell: process.platform === "win32",
      stdio: "inherit",
    },
  );

  if (reset.status === 0) {
    const tests = spawnSync(vitestBin, ["run", ...process.argv.slice(2)], {
      env,
      shell: process.platform === "win32",
      stdio: "inherit",
    });
    exitCode = tests.status ?? 1;
  } else {
    exitCode = reset.status ?? 1;
  }
} finally {
  rmSync(signatureDirectory, { force: true, recursive: true });
}

process.exit(exitCode);
