import { connect, type Connection } from "@tursodatabase/serverless";
import {
  getTursoQaRequests,
  buildTursoQaRequestStatements,
  buildTursoQaActivityStatements,
  buildTursoQaSystemSettingStatements,
} from "@/lib/seed/turso-qa-fixtures";

const confirmationFlags = ["--confirm-client-qa", "--confirm-thesis-demo"];

function connectToTurso(): Connection {
  if (process.env.DATABASE_PROVIDER !== "turso") {
    throw new Error(
      "Turso QA request seed requires DATABASE_PROVIDER=turso. Refusing to run in non-Turso mode.",
    );
  }

  const url = process.env.TURSO_DATABASE_URL?.trim();
  const authToken = process.env.TURSO_AUTH_TOKEN?.trim();

  if (!url || !authToken) {
    throw new Error(
      "Turso QA request seed requires TURSO_DATABASE_URL and TURSO_AUTH_TOKEN.",
    );
  }

  if (!confirmationFlags.some((flag) => process.argv.includes(flag))) {
    throw new Error(
      "Turso QA request seed requires --confirm-client-qa. Refusing to seed requests without explicit confirmation.",
    );
  }

  return connect({ authToken, url });
}

async function main() {
  const db = connectToTurso();
  const currentYear = new Date().getFullYear();
  const requests = getTursoQaRequests(currentYear);

  // Verify that required synthetic residents exist before inserting requests
  const requiredResidentIds = [
    "00000000-0000-4000-8000-000000000003",
    "00000000-0000-4000-8000-000000000004",
  ];
  const statement = await db.prepare("SELECT id FROM profiles WHERE id IN (?, ?)");
  const profileRows = (await statement.all(requiredResidentIds)) as { id: string }[];
  const existingResidentIds = new Set(profileRows.map((row) => String(row.id)));
  for (const id of requiredResidentIds) {
    if (!existingResidentIds.has(id)) {
      throw new Error(
        `Required synthetic resident profile ${id} was not found in Turso database. ` +
        "Run the full account seed first if setting up a fresh database.",
      );
    }
  }

  const timestamp = new Date().toISOString();
  const requestStatements = buildTursoQaRequestStatements(requests);
  const activityStatements = buildTursoQaActivityStatements(requests);
  const systemSettingStatements = buildTursoQaSystemSettingStatements(timestamp);

  await db.batch(
    [
      ...requestStatements,
      ...activityStatements,
      ...systemSettingStatements,
    ],
    "immediate",
  );

  process.stdout.write(
    `Successfully seeded ${requests.length} canonical client QA requests for year ${currentYear}.\n`,
  );
  process.stdout.write(
    "Existing accounts, password hashes, and sessions were completely untouched.\n",
  );
  process.stdout.write(
    "Operation is idempotent and safe to rerun.\n",
  );
}

main().catch((error: unknown) => {
  process.stderr.write(
    `${error instanceof Error ? error.message : "Turso QA requests seed failed."}\n`,
  );
  process.exitCode = 1;
});
