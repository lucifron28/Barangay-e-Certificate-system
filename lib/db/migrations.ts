import "server-only";

import { readFileSync } from "node:fs";
import path from "node:path";
import type Database from "better-sqlite3";

const migrationDirectory = path.join(
  /* turbopackIgnore: true */ process.cwd(),
  "database",
  "migrations",
);

export type MigrationStatus = {
  applied: string[];
  pending: string[];
};

function migrationFiles() {
  return [
    "0000_initial_schema.sql",
    "0001_client_deployment.sql",
    "0002_full_online_workflow.sql",
    "0003_manual_payment_verification.sql",
  ];
}

function migrationStatements(contents: string) {
  return contents
    .split(/;\s*(?:\r?\n|$)/)
    .map((statement) => statement.trim())
    .filter(Boolean);
}

function readMigration(version: string) {
  switch (version) {
    case "0000_initial_schema.sql":
      return readFileSync(
        path.join(process.cwd(), "database", "migrations", "0000_initial_schema.sql"),
        "utf8",
      );
    case "0001_client_deployment.sql":
      return readFileSync(
        path.join(process.cwd(), "database", "migrations", "0001_client_deployment.sql"),
        "utf8",
      );
    case "0002_full_online_workflow.sql":
      return readFileSync(
        path.join(process.cwd(), "database", "migrations", "0002_full_online_workflow.sql"),
        "utf8",
      );
    case "0003_manual_payment_verification.sql":
      return readFileSync(
        path.join(process.cwd(), "database", "migrations", "0003_manual_payment_verification.sql"),
        "utf8",
      );
    default:
      throw new Error(`Unknown migration: ${version}`);
  }
}

function ensureMigrationTable(db: Database.Database) {
  db.exec(
    "CREATE TABLE IF NOT EXISTS schema_migrations (version TEXT PRIMARY KEY, applied_at TEXT NOT NULL DEFAULT (datetime('now')))",
  );
}

function isDuplicateColumnError(error: unknown) {
  return error instanceof Error && /duplicate column name/i.test(error.message);
}

export function migrateSqlite(db: Database.Database) {
  ensureMigrationTable(db);

  for (const version of migrationFiles()) {
    const applied = db
      .prepare("SELECT version FROM schema_migrations WHERE version = ?")
      .get(version) as { version: string } | undefined;
    if (applied) continue;

    const run = db.transaction(() => {
      for (const statement of migrationStatements(
        readMigration(version),
      )) {
        try {
          db.exec(statement);
        } catch (error) {
          if (!isDuplicateColumnError(error)) throw error;
        }
      }
      db.prepare("INSERT INTO schema_migrations (version) VALUES (?)").run(version);
    });
    run();
  }
}

export function getMigrationStatus(db: Database.Database): MigrationStatus {
  ensureMigrationTable(db);
  const applied = new Set(
    db
      .prepare("SELECT version FROM schema_migrations ORDER BY version")
      .all()
      .map((row) => String((row as { version: string }).version)),
  );
  const versions = migrationFiles();
  return {
    applied: versions.filter((version) => applied.has(version)),
    pending: versions.filter((version) => !applied.has(version)),
  };
}

export { migrationDirectory, migrationFiles, migrationStatements, readMigration };
