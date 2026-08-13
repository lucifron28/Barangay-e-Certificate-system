import { getDatabaseProvider } from "@/lib/db/provider";

async function main() {
  if (getDatabaseProvider() !== "sqlite") {
    throw new Error("demo:reset is SQLite-only and refuses to load or reset a remote database.");
  }

  await import("./demo-reset");
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : "SQLite demo reset failed."}\n`);
  process.exitCode = 1;
});
