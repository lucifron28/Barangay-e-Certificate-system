import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { FlashMessage } from "@/components/ui/flash-message";
import { PaymentBadge } from "@/components/ui/payment-badge";
import { SetupRequired } from "@/components/ui/setup-required";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  cancelCertificateRequestAction,
  resubmitCertificateRequestAction,
} from "@/lib/actions/requests";
import { requireResident } from "@/lib/auth/guards";
import { getResidentRequest } from "@/lib/services/certificate-data";
import {
  certificateLabel,
  formatCurrency,
  formatDate,
  formatTime,
} from "@/lib/utils/format";
import type { Json } from "@/types/database";
import { getSubmittedInformation } from "@/lib/services/submitted-data";
import { certificateHasField } from "@/lib/services/certificate-fields";
import { isFullyOnlineDemo } from "@/lib/services/issuance-mode";

type RequestDetailsProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{
    error?: string | string[];
    message?: string | string[];
  }>;
};

type SubmittedFields = {
  certificate_specific?: {
    birthdate?: string | null;
    place_of_birth?: string | null;
    years_of_residency?: number | null;
  };
  common?: {
    address_sitio?: string;
    age?: number;
    contact_number?: string;
    full_name?: string;
    purpose?: string;
  };
};

function submittedFields(value: Json): SubmittedFields {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as SubmittedFields)
    : {};
}

export default async function ResidentRequestDetailsPage({
  params,
  searchParams,
}: RequestDetailsProps) {
  const context = await requireResident();
  const { id } = await params;
  const query = await searchParams;

  if (context.setupMissing) {
    return <SetupRequired missingEnv={context.missingEnv} />;
  }

  const request = await getResidentRequest(id, context.profile.id, context.supabase);

  if (!request) {
    return (
      <div className="space-y-4">
        <Link href="/resident/my-requests" className="btn btn-ghost btn-sm">
          <ArrowLeft className="size-4" aria-hidden />
          Back
        </Link>
        <div className="alert alert-error">Request not found.</div>
      </div>
    );
  }

  const schedule = request.pickup_schedules[0];
  const submitted = submittedFields(request.submitted_data);
  const submittedInformation = getSubmittedInformation(request);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link href="/resident/my-requests" className="btn btn-ghost btn-sm">
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
            <dt className="text-sm text-base-content/60">Purpose</dt>
            <dd className="font-medium">{request.purpose}</dd>
          </div>
          <div>
            <dt className="text-sm text-base-content/60">Date Requested</dt>
            <dd className="font-medium">{formatDate(request.date_requested)}</dd>
          </div>
          {!isFullyOnlineDemo ? <div>
            <dt className="text-sm text-base-content/60">Pickup Schedule</dt>
            <dd className="font-medium">
              {schedule
                ? `${formatDate(schedule.pickup_date)} at ${formatTime(
                    schedule.pickup_time,
                  )}`
                : "Not scheduled"}
            </dd>
          </div> : null}
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
          <h2 className="font-semibold">Submitted Information</h2>
          <dl className="mt-3 grid gap-3 sm:grid-cols-2">
            {submittedInformation.map((field) => <div key={field.label}><dt className="text-sm text-base-content/60">{field.label}</dt><dd className="font-medium">{field.value}</dd></div>)}
          </dl>
        </div>

        {request.status === "pending" ? (
          <form action={cancelCertificateRequestAction} className="mt-6">
            <input type="hidden" name="request_id" value={request.id} />
            <button className="btn btn-error" type="submit">
              Cancel Pending Request
            </button>
          </form>
        ) : null}
      </section>

      {request.status === "rejected" ? (
        <form
          action={resubmitCertificateRequestAction}
          className="grid gap-4 rounded-lg border border-base-300 bg-base-100 p-6 shadow-sm md:grid-cols-2"
        >
          <input type="hidden" name="request_id" value={request.id} />
          <input
            type="hidden"
            name="certificate_type"
            value={request.certificate_type}
          />
          <h2 className="text-lg font-bold md:col-span-2">Edit and Resubmit</h2>
          <label className="form-control">
            <span className="label-text">Full Name</span>
            <input
              className="input input-bordered"
              name="full_name"
              defaultValue={submitted.common?.full_name ?? context.profile.full_name}
              required
            />
          </label>
          <label className="form-control">
            <span className="label-text">Age</span>
            <input
              className="input input-bordered"
              name="age"
              type="number"
              defaultValue={submitted.common?.age ?? context.profile.age ?? ""}
              required
            />
          </label>
          {certificateHasField(request.certificate_type, "sitio") ? (
            <label className="form-control">
              <span className="label-text">Sitio</span>
              <input
                className="input input-bordered"
                name="sitio"
                defaultValue={
                  submitted.common?.address_sitio ??
                  context.profile.address_sitio ??
                  ""
                }
                required
              />
            </label>
          ) : null}
          <label className="form-control">
            <span className="label-text">Contact Number</span>
            <input
              className="input input-bordered"
              name="contact_number"
              defaultValue={
                submitted.common?.contact_number ??
                context.profile.contact_number ??
                ""
              }
              required
            />
          </label>
          <label className="form-control md:col-span-2">
            <span className="label-text">Purpose</span>
            <textarea
              className="textarea textarea-bordered"
              name="purpose"
              defaultValue={submitted.common?.purpose ?? request.purpose}
              required
            />
          </label>
          {request.certificate_type === "barangay_certificate" ? (
            <label className="form-control">
              <span className="label-text">Place of Birth</span>
              <input
                className="input input-bordered"
                name="place_of_birth"
                defaultValue={submitted.certificate_specific?.place_of_birth ?? ""}
                required
              />
            </label>
          ) : null}
          {request.certificate_type === "barangay_residency" ? (
            <>
              <label className="form-control">
                <span className="label-text">Birthdate</span>
                <input
                  className="input input-bordered"
                  name="birthdate"
                  type="date"
                  defaultValue={
                    submitted.certificate_specific?.birthdate ??
                    context.profile.date_of_birth ??
                    ""
                  }
                  required
                />
              </label>
              <label className="form-control">
                <span className="label-text">Years of Residency</span>
                <input
                  className="input input-bordered"
                  min="0"
                  name="years_of_residency"
                  type="number"
                  defaultValue={
                    submitted.certificate_specific?.years_of_residency ?? ""
                  }
                  required
                />
              </label>
            </>
          ) : null}
          <div className="md:col-span-2">
            <button className="btn btn-primary" type="submit">
              Resubmit Request
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
