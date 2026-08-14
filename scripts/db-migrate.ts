export async function main() {
  const { getDatabaseProvider } = await import("@/lib/db/provider");
  const provider = getDatabaseProvider();
  if (provider === "sqlite") {
    const { getSqliteDb } = await import("@/lib/db/sqlite/client");
    getSqliteDb();
    process.stdout.write("SQLite migrations applied.\n");
    return;
  }
  if (provider === "turso") {
    const { migrateTurso } = await import("@/lib/db/turso/client");
    await migrateTurso();
    process.stdout.write("Turso migrations applied.\n");
    return;
  }
  throw new Error(`Database migrations are not managed by this script for ${provider}.`);
}

if (process.argv[1]?.endsWith("db-migrate.ts")) {
  main().catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : "Migration failed."}\n`);
    process.exitCode = 1;
  });
}
