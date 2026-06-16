import Link from "next/link";
import { ArrowLeft, CalendarPlus, Printer } from "lucide-react";
import { SubmitButton } from "@/components/forms/submit-button";
import { FlashMessage } from "@/components/ui/flash-message";
import { PaymentBadge } from "@/components/ui/payment-badge";
import { SetupRequired } from "@/components/ui/setup-required";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  acceptRequestAction,
  markPaymentPaidAction,
  markRequestDoneAction,
  markRequestReadyAction,
  rejectRequestAction,
} from "@/lib/actions/admin";
import { requireAdmin } from "@/lib/auth/guards";
import { getAdminRequest } from "@/lib/services/certificate-data";
import {
  certificateLabel,
  formatCurrency,
  formatDate,
  formatTime,
} from "@/lib/utils/format";

type AdminRequestDetailsProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{
    error?: string | string[];
    message?: string | string[];
  }>;
};

export default async function AdminRequestDetailsPage({
  params,
  searchParams,
}: AdminRequestDetailsProps) {
  const context = await requireAdmin();
  const { id } = await params;
  const query = await searchParams;

  if (context.setupMissing) {
    return <SetupRequired missingEnv={context.missingEnv} />;
  }

  const request = await getAdminRequest(id, context.supabase);

  if (!request) {
    return (
      <div className="space-y-4">
        <Link href="/admin/certificate-requests" className="btn btn-ghost btn-sm">
          <ArrowLeft className="size-4" aria-hidden />
          Back
        </Link>
        <div className="alert alert-error">Request not found.</div>
      </div>
    );
  }

  const schedule = request.pickup_schedules[0];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link href="/admin/certificate-requests" className="btn btn-ghost btn-sm">
        <ArrowLeft className="size-4" aria-hidden />
        Back
      </Link>
      <FlashMessage error={query?.error} message={query?.message} />

      <section className="rounded-lg border border-base-300 bg-base-100 p-6 shadow-sm">
        <div className="flex flex-col gap-3 border-b border-base-300 pb-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">{request.request_number}</h1>
            <p className="text-base-content/70">
              {certificateLabel(request.certificate_type)}
            </p>
          </div>
          <StatusBadge status={request.status} />
        </div>

        <dl className="mt-6 grid gap-4 md:grid-cols-2">
          <div>
            <dt className="text-sm text-base-content/60">Resident Name</dt>
            <dd className="font-medium">{request.resident?.full_name ?? "Unknown"}</dd>
          </div>
          <div>
            <dt className="text-sm text-base-content/60">Age</dt>
            <dd className="font-medium">{request.resident?.age ?? "Not set"}</dd>
          </div>
          <div>
            <dt className="text-sm text-base-content/60">Address / Sitio</dt>
            <dd className="font-medium">
              {request.resident?.address_sitio ?? "Not set"}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-base-content/60">Contact Number</dt>
            <dd className="font-medium">
              {request.resident?.contact_number ?? "Not set"}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-base-content/60">Purpose</dt>
            <dd className="font-medium">{request.purpose}</dd>
          </div>
          <div>
            <dt className="text-sm text-base-content/60">Date Requested</dt>
            <dd className="font-medium">{formatDate(request.date_requested)}</dd>
          </div>
          <div>
            <dt className="text-sm text-base-content/60">Pickup Schedule</dt>
            <dd className="font-medium">
              {schedule
                ? `${formatDate(schedule.pickup_date)} at ${formatTime(
                    schedule.pickup_time,
                  )}`
                : "Not scheduled"}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-base-content/60">Remarks</dt>
            <dd className="font-medium">{request.remarks ?? "None"}</dd>
          </div>
          <div>
            <dt className="text-sm text-base-content/60">Fee</dt>
            <dd className="font-medium">{formatCurrency(request.fee_amount)}</dd>
          </div>
          <div>
            <dt className="text-sm text-base-content/60">Payment Status</dt>
            <dd className="font-medium">
              <PaymentBadge status={request.payment_status} />
            </dd>
          </div>
        </dl>

        <div className="mt-6 rounded-lg bg-base-200 p-4">
          <h2 className="font-semibold">Submitted JSON data</h2>
          <pre className="mt-3 overflow-x-auto whitespace-pre-wrap text-xs">
            {JSON.stringify(request.submitted_data, null, 2)}
          </pre>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <form
          action={acceptRequestAction}
          className="rounded-lg border border-base-300 bg-base-100 p-5 shadow-sm"
        >
          <h2 className="font-bold">Accept request</h2>
          <input type="hidden" name="request_id" value={request.id} />
          <label className="form-control mt-3">
            <span className="label">
              <span className="label-text">Remarks</span>
            </span>
            <textarea className="textarea textarea-bordered" name="remarks" />
          </label>
          <div className="mt-4 flex flex-wrap gap-2">
            <SubmitButton
              className="btn btn-info"
              disabled={request.status !== "pending"}
              pendingText="Accepting..."
            >
              Accept Request
            </SubmitButton>
            <Link
              href={`/admin/pickup-schedules?request_id=${request.id}`}
              className="btn btn-outline"
            >
              <CalendarPlus className="size-4" aria-hidden />
              Set Pickup Schedule
            </Link>
          </div>
        </form>

        <form
          action={rejectRequestAction}
          className="rounded-lg border border-base-300 bg-base-100 p-5 shadow-sm"
        >
          <h2 className="font-bold">Reject request</h2>
          <input type="hidden" name="request_id" value={request.id} />
          <label className="form-control mt-3">
            <span className="label">
              <span className="label-text">Rejection Remarks</span>
            </span>
            <textarea className="textarea textarea-bordered" name="remarks" required />
          </label>
          <div className="mt-4 flex flex-wrap gap-2">
            <SubmitButton
              className="btn btn-error"
              disabled={request.status !== "pending"}
              pendingText="Rejecting..."
            >
              Reject Request
            </SubmitButton>
            <Link
              href={`/admin/generate-certificate/${request.id}`}
              className="btn btn-primary"
            >
              <Printer className="size-4" aria-hidden />
              Generate Certificate
            </Link>
          </div>
        </form>
      </section>

      <section className="rounded-lg border border-base-300 bg-base-100 p-5 shadow-sm">
        <h2 className="font-bold">Claiming and payment actions</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {request.status === "accepted" && schedule ? (
            <form action={markRequestReadyAction}>
              <input type="hidden" name="request_id" value={request.id} />
              <button className="btn btn-accent" type="submit">
                Mark Ready for Pickup
              </button>
            </form>
          ) : null}
          {request.payment_status === "unpaid" ? (
            <form action={markPaymentPaidAction}>
              <input type="hidden" name="request_id" value={request.id} />
              <button className="btn btn-warning" type="submit">
                Mark Payment as Paid
              </button>
            </form>
          ) : null}
          {request.status === "ready_for_pickup" ? (
            <form action={markRequestDoneAction}>
              <input type="hidden" name="request_id" value={request.id} />
              <button className="btn btn-success" type="submit">
                Mark Done After Claiming
              </button>
            </form>
          ) : null}
        </div>
      </section>
    </div>
  );
}
