"use client";

import Link from "next/link";
import { PenLine } from "lucide-react";
import { useState } from "react";
import { PrintableCertificate } from "@/components/certificates/printable-certificate";
import { SubmitButton } from "@/components/forms/submit-button";
import type { CertificateRequestWithResident } from "@/lib/certificates/template-data";

type CertificateIssuanceEditorProps = {
  action: (formData: FormData) => void | Promise<void>;
  barangayCaptainName: string;
  initialDateIssued: string;
  isReissue: boolean;
  canManageSignerSettings: boolean;
  signingAvailable: boolean;
  request: CertificateRequestWithResident;
};

export function CertificateIssuanceEditor({
  action,
  barangayCaptainName,
  initialDateIssued,
  isReissue,
  canManageSignerSettings,
  signingAvailable,
  request,
}: CertificateIssuanceEditorProps) {
  const [dateIssued, setDateIssued] = useState(initialDateIssued);

  return (
    <>
      <PrintableCertificate
        barangayCaptainName={barangayCaptainName}
        dateIssued={dateIssued}
        draft
        request={request}
      />
      <form
        action={action}
        className="no-print space-y-4 rounded-lg border border-base-300 bg-base-100 p-5 shadow-sm"
      >
        <input type="hidden" name="request_id" value={request.id} />
        <input type="hidden" name="signing_confirmation" value="sign" />
        <p className="text-sm text-base-content/70">
          {isReissue
            ? "Signing creates a replacement PDF and QR record. The revoked certificate and its original PDF remain in the audit trail."
            : `Signing applies ${barangayCaptainName}'s configured signature image and printed name, then saves an immutable PDF issuance.`}
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <label className="form-control">
            <span className="label">
              <span className="label-text">Date Issued</span>
            </span>
            <input
              className="input input-bordered"
              name="date_issued"
              type="date"
              value={dateIssued}
              onChange={(event) => setDateIssued(event.target.value)}
              required
            />
          </label>
          <SubmitButton
            className="btn btn-primary"
            disabled={!signingAvailable}
            pendingText="Signing and issuing..."
          >
            <PenLine className="size-4" aria-hidden />
            Sign & Issue Certificate
          </SubmitButton>
        </div>
        {!signingAvailable ? (
          <div className="alert alert-warning text-sm" id="signature-needed-message">
            <span>
              Signing is disabled because an accessible official signature image
              and signer name are not configured.
            </span>
            {canManageSignerSettings ? (
              <Link className="link font-semibold" href="/admin/settings">
                Open signer settings
              </Link>
            ) : (
              <span>Ask the Main Admin to configure the signer settings.</span>
            )}
          </div>
        ) : null}
      </form>
    </>
  );
}
