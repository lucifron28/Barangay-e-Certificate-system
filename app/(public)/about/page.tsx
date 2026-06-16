import { CheckCircle2, FileText, Info, Landmark } from "lucide-react";

const covered = [
  "Barangay Clearance",
  "Barangay Certificate",
  "Barangay Indigency",
  "Barangay Residency",
];

export default function AboutPage() {
  return (
    <main className="px-6 py-12 lg:px-12 xl:px-20">
      <section className="mx-auto max-w-5xl">
        <div className="badge badge-primary badge-outline mb-4">About</div>
        <h1 className="text-4xl font-bold">What the system does</h1>
        <p className="mt-4 max-w-3xl text-lg text-base-content/75">
          The Barangay Bato e-Certificate System helps residents submit
          certificate requests online and helps the Barangay Secretary manage
          reviews, pickup schedules, printable placeholders, records, reports,
          and activity logs. This build is a thesis/demo implementation prepared
          for future Supabase deployment.
        </p>

        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          <div className="rounded-lg border border-base-300 bg-base-100 p-6">
            <Info className="mb-4 size-8 text-primary" aria-hidden />
            <h2 className="font-bold">Who can use it</h2>
            <p className="mt-2 text-sm text-base-content/70">
              Residents of Barangay Bato can register and submit requests.
              Barangay Secretary/Admin users can review and manage requests.
            </p>
          </div>
          <div className="rounded-lg border border-base-300 bg-base-100 p-6">
            <FileText className="mb-4 size-8 text-primary" aria-hidden />
            <h2 className="font-bold">Covered documents</h2>
            <ul className="mt-2 space-y-2 text-sm text-base-content/70">
              {covered.map((item) => (
                <li key={item} className="flex gap-2">
                  <CheckCircle2 className="mt-0.5 size-4 text-success" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-lg border border-base-300 bg-base-100 p-6">
            <Landmark className="mb-4 size-8 text-primary" aria-hidden />
            <h2 className="font-bold">Physical office steps</h2>
            <p className="mt-2 text-sm text-base-content/70">
              Online payment is not included. Fees, official stamp, and claiming
              are done at the barangay office. The electronic signature display
              is visual-only for the thesis/demo and is not a legal digital
              signature.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
