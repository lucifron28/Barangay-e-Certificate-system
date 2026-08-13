import { spawnSync } from "node:child_process";
import process from "node:process";

// Keep the legacy command available while using the same canonical demo data as
// `demo:reset`, CI, and local client-preview testing.
const runner = process.platform === "win32"
  ? ".\\node_modules\\.bin\\tsx.cmd"
  : "node_modules/.bin/tsx";

const result = spawnSync(
  runner,
  ["--tsconfig", "scripts/tsconfig.json", "scripts/demo-reset.ts"],
  {
    env: process.env,
    shell: process.platform === "win32",
    stdio: "inherit",
  },
);

if (result.error) {
  process.stderr.write(`${result.error.message}\n`);
  process.exit(1);
}

process.exit(result.status ?? 1);
