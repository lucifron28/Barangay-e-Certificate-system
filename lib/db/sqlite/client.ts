import "server-only";

import Database from "better-sqlite3";
import { mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { env } from "@/lib/env";
import { migrateSqlite } from "@/lib/db/migrations";

let cachedDb: Database.Database | null = null;

function sqlitePathFromUrl(databaseUrl: string) {
  const value = databaseUrl.startsWith("file:")
    ? databaseUrl.slice("file:".length)
    : databaseUrl;

  return path.resolve(/* turbopackIgnore: true */ process.cwd(), value);
}

export function getSqliteDb() {
  if (cachedDb) {
    return cachedDb;
  }

  const dbPath = sqlitePathFromUrl(env.sqliteDatabaseUrl);
  mkdirSync(path.dirname(dbPath), { recursive: true });

  const db = new Database(dbPath);
  db.pragma("foreign_keys = ON");
  db.pragma("journal_mode = WAL");

  const schemaPath = path.join(
    /* turbopackIgnore: true */ process.cwd(),
    "lib",
    "db",
    "sqlite",
    "schema.sql",
  );
  db.exec(readFileSync(schemaPath, "utf8"));
  migrateSqlite(db);

  cachedDb = db;
  return db;
}
