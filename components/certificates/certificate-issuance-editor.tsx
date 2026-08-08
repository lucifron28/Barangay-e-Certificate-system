"use client";

import { Save } from "lucide-react";
import { useState } from "react";
import { PrintableCertificate } from "@/components/certificates/printable-certificate";
import { SubmitButton } from "@/components/forms/submit-button";
import type { CertificateRequestWithResident } from "@/lib/certificates/template-data";

type CertificateIssuanceEditorProps = {
  action: (formData: FormData) => void | Promise<void>;
  barangayCaptainName: string;
  initialDateIssued: string;
  isReissue: boolean;
  preparedBy: string;
  request: CertificateRequestWithResident;
};

export function CertificateIssuanceEditor({
  action,
  barangayCaptainName,
  initialDateIssued,
  isReissue,
  preparedBy,
  request,
}: CertificateIssuanceEditorProps) {
  const [dateIssued, setDateIssued] = useState(initialDateIssued);

  return (
    <>
      <PrintableCertificate
        barangayCaptainName={barangayCaptainName}
        dateIssued={dateIssued}
        draft
        preparedBy={preparedBy}
        request={request}
      />
      <form
        action={action}
        className="no-print flex flex-wrap items-end gap-3 rounded-lg border border-base-300 bg-base-100 p-5 shadow-sm"
      >
        <input type="hidden" name="request_id" value={request.id} />
        <p className="basis-full text-sm text-base-content/70">
          {isReissue
            ? "Reissue certificate: the revoked record remains in the audit trail and this issuance receives a new number and QR token."
            : "Save the final issued certificate after reviewing the printable preview."}
        </p>
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
        <SubmitButton pendingText="Saving...">
          <Save className="size-4" aria-hidden />
          Save Certificate Record
        </SubmitButton>
      </form>
    </>
  );
}
