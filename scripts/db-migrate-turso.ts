import { migrateTurso } from "@/lib/db/turso/client";

migrateTurso()
  .then(() => process.stdout.write("Turso migrations applied.\n"))
  .catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : "Turso migration failed."}\n`);
    process.exitCode = 1;
  });
