import "server-only";

import { connect, type Connection } from "@tursodatabase/serverless";
import { env } from "@/lib/env";
import {
  migrationFiles,
  migrationStatements,
  readMigration,
} from "@/lib/db/migrations";

let cachedClient: Connection | null = null;

export function hasTursoCredentials() {
  return Boolean(env.tursoDatabaseUrl && env.tursoAuthToken);
}

export function getTursoDb() {
  if (cachedClient) return cachedClient;
  if (!hasTursoCredentials()) {
    throw new Error(
      "Turso mode requires TURSO_DATABASE_URL and TURSO_AUTH_TOKEN. SQLite fallback is disabled.",
    );
  }

  cachedClient = connect({
    authToken: env.tursoAuthToken,
    url: env.tursoDatabaseUrl,
  });
  return cachedClient;
}

export function resetTursoClientForTests() {
  cachedClient = null;
}

export async function prepareTurso<T = Record<string, unknown>>(
  sql: string,
  args: unknown[] = [],
) {
  const statement = await getTursoDb().prepare(sql);
  return (await statement.get(args)) as T | undefined;
}

export async function allTurso<T = Record<string, unknown>>(
  sql: string,
  args: unknown[] = [],
) {
  const statement = await getTursoDb().prepare(sql);
  return (await statement.all(args)) as T[];
}

export async function runTurso(sql: string, args: unknown[] = []) {
  const statement = await getTursoDb().prepare(sql);
  return statement.run(args);
}

function isDuplicateColumnError(error: unknown) {
  return error instanceof Error && /duplicate column name/i.test(error.message);
}

export async function migrateTurso() {
  const db = getTursoDb();
  await db.run(
    "CREATE TABLE IF NOT EXISTS schema_migrations (version TEXT PRIMARY KEY, applied_at TEXT NOT NULL DEFAULT (datetime('now')))",
  );

  for (const version of migrationFiles()) {
    const applied = await db.get(
      "SELECT version FROM schema_migrations WHERE version = ?",
      version,
    );
    if (applied) continue;

    const statements = migrationStatements(
      readMigration(version),
    );
    try {
      await db.batch(
        [
          ...statements.map((sql) => ({ sql })),
          { sql: "INSERT INTO schema_migrations (version) VALUES (?)", args: [version] },
        ],
        "immediate",
      );
    } catch (error) {
      if (!isDuplicateColumnError(error)) throw error;
      // An older database may already contain an additive column. Apply the
      // remaining idempotent statements individually, then record the version.
      for (const statement of statements) {
        try {
          await db.run(statement);
        } catch (statementError) {
          if (!isDuplicateColumnError(statementError)) throw statementError;
        }
      }
      await db.run("INSERT INTO schema_migrations (version) VALUES (?)", version);
    }
  }
}

export async function getTursoMigrationStatus() {
  let appliedRows: { version: string }[] = [];
  try {
    appliedRows = await allTurso<{ version: string }>(
      "SELECT version FROM schema_migrations ORDER BY version",
    );
  } catch (error) {
    if (!(error instanceof Error) || !/no such table: schema_migrations/i.test(error.message)) {
      throw error;
    }
  }
  const applied = new Set(appliedRows.map((row) => String(row.version)));
  return {
    applied: migrationFiles().filter((version) => applied.has(version)),
    pending: migrationFiles().filter((version) => !applied.has(version)),
  };
}
