async function main() {
  const { getDatabaseProvider } = await import("@/lib/db/provider");
  const provider = getDatabaseProvider();
  let status;
  if (provider === "sqlite") {
    const [{ getMigrationStatus }, { getSqliteDb }] = await Promise.all([
      import("@/lib/db/migrations"),
      import("@/lib/db/sqlite/client"),
    ]);
    status = getMigrationStatus(getSqliteDb());
  } else if (provider === "turso") {
    const { getTursoMigrationStatus } = await import("@/lib/db/turso/client");
    status = await getTursoMigrationStatus();
  } else {
    status = { applied: [], pending: [] };
  }

  process.stdout.write(`${JSON.stringify({ provider, ...status }, null, 2)}\n`);
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : "Migration status failed."}\n`);
  process.exitCode = 1;
});
