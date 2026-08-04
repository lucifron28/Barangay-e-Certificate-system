"use client";

import Link from "next/link";
import { Send } from "lucide-react";
import { useState } from "react";
import { SubmitButton } from "@/components/forms/submit-button";
import { createCertificateRequestAction } from "@/lib/actions/requests";
import {
  CERTIFICATE_TYPE_LABELS,
  CERTIFICATE_TYPES,
  type CertificateType,
} from "@/types/enums";
import type { Profile } from "@/types/database";

type CertificateRequestFormProps = {
  profile: Profile;
  today: string;
};

export function CertificateRequestForm({ profile, today }: CertificateRequestFormProps) {
  const [certificateType, setCertificateType] = useState<CertificateType>(
    "barangay_clearance",
  );
  const needsPlaceOfBirth = certificateType === "barangay_certificate";
  const needsResidencyFields = certificateType === "barangay_residency";

  return (
    <form
      action={createCertificateRequestAction}
      className="grid gap-5 rounded-lg border border-base-300 bg-base-100 p-6 shadow-sm md:grid-cols-2"
    >
      <label className="form-control md:col-span-2">
        <span className="label">
          <span className="label-text">Certificate Type</span>
        </span>
        <select
          className="select select-bordered"
          name="certificate_type"
          value={certificateType}
          onChange={(event) => setCertificateType(event.target.value as CertificateType)}
          required
        >
          {CERTIFICATE_TYPES.map((type) => (
            <option key={type} value={type}>
              {CERTIFICATE_TYPE_LABELS[type]}
            </option>
          ))}
        </select>
      </label>

      <label className="form-control">
        <span className="label">
          <span className="label-text">Full Name</span>
        </span>
        <input className="input input-bordered" name="full_name" required defaultValue={profile.full_name} />
      </label>
      <label className="form-control">
        <span className="label">
          <span className="label-text">Age</span>
        </span>
        <input
          className="input input-bordered"
          name="age"
          min="1"
          type="number"
          required
          defaultValue={profile.age ?? ""}
        />
      </label>
      <label className="form-control">
        <span className="label">
          <span className="label-text">Sitio</span>
        </span>
        <input
          className="input input-bordered"
          name="sitio"
          required
          defaultValue={profile.address_sitio ?? ""}
        />
      </label>
      <label className="form-control">
        <span className="label">
          <span className="label-text">Contact Number</span>
        </span>
        <input
          className="input input-bordered"
          name="contact_number"
          required
          defaultValue={profile.contact_number ?? ""}
        />
      </label>

      {needsPlaceOfBirth ? (
        <label className="form-control md:col-span-2">
          <span className="label">
            <span className="label-text">Place of Birth</span>
          </span>
          <input className="input input-bordered" name="place_of_birth" required />
        </label>
      ) : null}

      {needsResidencyFields ? (
        <>
          <label className="form-control">
            <span className="label">
              <span className="label-text">Birthdate</span>
            </span>
            <input
              className="input input-bordered"
              name="birthdate"
              type="date"
              required
              defaultValue={profile.date_of_birth ?? ""}
            />
          </label>
          <label className="form-control">
            <span className="label">
              <span className="label-text">Years of Residency</span>
            </span>
            <input
              className="input input-bordered"
              min="0"
              name="years_of_residency"
              type="number"
              required
            />
          </label>
        </>
      ) : null}

      <label className="form-control md:col-span-2">
        <span className="label">
          <span className="label-text">Purpose</span>
        </span>
        <textarea className="textarea textarea-bordered min-h-28" name="purpose" required />
      </label>
      <label className="form-control">
        <span className="label">
          <span className="label-text">Date Requested</span>
        </span>
        <input className="input input-bordered" name="date_requested" type="date" defaultValue={today} />
      </label>
      <div className="rounded-lg border border-dashed border-base-300 bg-base-200 p-4 md:col-span-2">
        <p className="font-semibold">Request details</p>
        <p className="mt-1 text-sm text-base-content/70">
          Only the fields required for the selected certificate are shown. Fees are displayed before online demo payment.
        </p>
      </div>
      <div className="alert alert-info md:col-span-2">
        <span>
          Issued certificates are available as verified PDF downloads in this online demo.
        </span>
      </div>
      <div className="flex flex-wrap gap-3 md:col-span-2">
        <SubmitButton pendingText="Submitting...">
          <Send className="size-4" aria-hidden />
          Submit Request
        </SubmitButton>
        <Link href="/resident/dashboard" className="btn btn-ghost">
          Cancel
        </Link>
      </div>
    </form>
  );
}
