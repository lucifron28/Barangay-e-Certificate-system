import { connect, type Connection } from "@tursodatabase/serverless";
import { assertStrongDemoPassword } from "@/lib/auth/demo-password-policy";
import {
  getTursoQaAccounts,
  getTursoQaRequests,
  buildTursoQaAccountStatements,
  buildTursoQaRequestStatements,
  buildTursoQaPaymentStatements,
  buildTursoQaActivityStatements,
  buildTursoQaSystemSettingStatements,
} from "@/lib/seed/turso-qa-fixtures";

const confirmationFlags = ["--confirm-client-qa", "--confirm-thesis-demo"];

function connectToTurso(): Connection {
  if (process.env.DATABASE_PROVIDER !== "turso") {
    throw new Error(
      "Turso demo seed requires DATABASE_PROVIDER=turso. Refusing to seed a non-Turso environment.",
    );
  }

  const url = process.env.TURSO_DATABASE_URL?.trim();
  const authToken = process.env.TURSO_AUTH_TOKEN?.trim();

  if (!url || !authToken) {
    throw new Error(
      "Turso demo seed requires TURSO_DATABASE_URL and TURSO_AUTH_TOKEN.",
    );
  }

  if (!confirmationFlags.some((flag) => process.argv.includes(flag))) {
    throw new Error(
      "Turso demo seed requires --confirm-client-qa. Refusing to overwrite credentials without explicit confirmation.",
    );
  }

  return connect({ authToken, url });
}

async function main() {
  const db = connectToTurso();
  const adminPassword = assertStrongDemoPassword(
    "DEMO_ADMIN_PASSWORD",
    process.env.DEMO_ADMIN_PASSWORD ?? "",
  );
  const residentPassword = assertStrongDemoPassword(
    "DEMO_RESIDENT_PASSWORD",
    process.env.DEMO_RESIDENT_PASSWORD ?? "",
  );
  const accounts = getTursoQaAccounts();
  const currentYear = new Date().getFullYear();
  const requests = getTursoQaRequests(currentYear);
  const timestamp = new Date().toISOString();

  await db.batch(
    [
      ...buildTursoQaAccountStatements(
        accounts,
        {
          admin: adminPassword,
          resident: residentPassword,
        },
        timestamp,
      ),
      {
        sql: `
          UPDATE auth_sessions
          SET revoked_at = ?
          WHERE profile_id IN (?, ?, ?, ?)
            AND revoked_at IS NULL
        `,
        args: [timestamp, ...accounts.map((account) => account.id)],
      },
      ...buildTursoQaRequestStatements(requests),
      ...buildTursoQaPaymentStatements(requests, timestamp),
      ...buildTursoQaActivityStatements(requests),
      ...buildTursoQaSystemSettingStatements(timestamp),
    ],
    "immediate",
  );

  process.stdout.write(
    `Seeded ${accounts.length} synthetic Turso QA accounts and ${requests.length} synthetic QA requests for year ${currentYear}.\n`,
  );
  process.stdout.write(
    "Existing records were preserved; rerunning this command is idempotent.\n",
  );
}

main().catch((error: unknown) => {
  process.stderr.write(
    `${error instanceof Error ? error.message : "Turso QA seed failed."}\n`,
  );
  process.exitCode = 1;
});
