import { spawnSync } from "node:child_process";
import process from "node:process";

const npmBin = process.platform === "win32" ? ".\\node_modules\\.bin\\tsx.cmd" : "node_modules/.bin/tsx";
const vitestBin = process.platform === "win32" ? ".\\node_modules\\.bin\\vitest.cmd" : "node_modules/.bin/vitest";
const env = {
  ...process.env,
  DATABASE_PROVIDER: "sqlite",
  CERTIFICATE_ISSUANCE_MODE: "fully_online_demo",
  CERTIFICATE_STORAGE_DIRECTORY: "data/certificates-test",
  DEMO_VERIFICATION_SAMPLES_PATH: "data/test-verification-samples.json",
  SQLITE_DATABASE_URL: "file:./data/test.sqlite",
  SMTP_USER: "",
  SMTP_PASS: "",
  EMAIL_FROM: "",
  SESSION_COOKIE_SECRET: "test-session-cookie-secret-that-is-long-enough",
  LOCAL_DEMO_SECRET: "test-local-demo-secret-that-is-long-enough",
  CERTIFICATE_STORAGE_PROVIDER: "local",
};

const reset = spawnSync(npmBin, ["--tsconfig", "scripts/tsconfig.json", "scripts/demo-reset.ts"], {
  env,
  shell: process.platform === "win32",
  stdio: "inherit",
});

if (reset.status !== 0) {
  process.exit(reset.status ?? 1);
}

const tests = spawnSync(vitestBin, ["run", ...process.argv.slice(2)], {
  env,
  shell: process.platform === "win32",
  stdio: "inherit",
});

process.exit(tests.status ?? 1);
