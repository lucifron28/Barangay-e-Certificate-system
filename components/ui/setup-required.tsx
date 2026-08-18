import { Settings } from "lucide-react";

export function SetupRequired({ missingEnv }: { missingEnv: string[] }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-base-200 p-6">
      <section className="max-w-2xl rounded-lg border border-base-300 bg-base-100 p-8 shadow-sm">
        <Settings className="mb-4 size-10 text-primary" aria-hidden />
        <h1 className="text-2xl font-bold">Service configuration required</h1>
        <p className="mt-3 text-base-content/70">
          Add the missing environment variables, apply the database migration,
          then restart the dev server.
        </p>
        <div className="mt-5 rounded-lg bg-base-200 p-4">
          <p className="text-sm font-semibold">Missing variables</p>
          <ul className="mt-2 list-disc pl-5 text-sm">
            {missingEnv.map((item) => (
              <li key={item}>
                <code>{item}</code>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}
