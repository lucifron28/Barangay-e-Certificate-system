import { SealImage } from "@/components/branding/seal-image";
import { getCertificateTemplateData } from "@/lib/certificates/template-data";
import {
  buildCertificateBodyContent,
  certificateTemplateSignatureLabel,
  certificateTemplateSignatureRole,
  certificateTemplateSalutation,
  certificateTemplateTitle,
  CERTIFICATE_TEMPLATE_HEADER_LINES,
  CERTIFICATE_TEMPLATE_OFFICE_TITLES,
} from "@/lib/certificates/template-copy";
import type { CertificateRequestWithResident } from "@/lib/certificates/template-data";
import type { CertificateRequest, CertificateSnapshot } from "@/types/database";

type PrintableCertificateProps = {
  barangayCaptainName?: string;
  certificateNumber?: string;
  dateIssued?: string;
  draft?: boolean;
  request: CertificateRequestWithResident;
  signatureImageUrl?: string | null;
  snapshot?: CertificateSnapshot;
};

const WATERMARK_SIZE_CLASSES = {
  barangay_certificate: "size-[6.5in]",
  barangay_clearance: "size-[7.75in]",
  barangay_indigency: "size-[6.5in]",
  barangay_residency: "size-[6.5in]",
} as const;

function Header({
  certificateType,
}: {
  certificateType: CertificateRequest["certificate_type"];
}) {
  const headerLines = CERTIFICATE_TEMPLATE_HEADER_LINES[certificateType];
  const officeTitle = CERTIFICATE_TEMPLATE_OFFICE_TITLES[certificateType];

  return (
    <header className="relative text-center">
      {/* TODO: Confirm final seal size and exact print positioning against the approved certificate template. */}
      <div className="absolute left-0 top-0 size-20">
        <SealImage seal="mauban" className="size-full object-contain" />
      </div>
      <div className="absolute right-0 top-0 size-20">
        <SealImage
          seal="barangay-bato"
          className="size-full object-contain"
        />
      </div>
      <p className="text-sm uppercase">{headerLines[0]}</p>
      <p className="text-sm">{headerLines[1]}</p>
      <p className="text-sm">{headerLines[2]}</p>
      <h1 className="mt-2 text-2xl font-bold uppercase tracking-normal">
        {headerLines[3]}
      </h1>
      <p className="mt-2 font-serif text-lg font-bold uppercase tracking-wide text-[#3873b8]">
        {officeTitle}
      </p>
    </header>
  );
}

function Watermark({
  certificateType,
}: {
  certificateType: CertificateRequest["certificate_type"];
}) {
  return (
    <div
      className="pointer-events-none absolute inset-0 flex items-center justify-center"
      aria-hidden
    >
      {/* TODO: Confirm the final watermark scale and opacity against a client-approved print proof. */}
      <SealImage
        seal="barangay-bato"
        className={`${WATERMARK_SIZE_CLASSES[certificateType]} object-contain opacity-[0.2]`}
      />
    </div>
  );
}

function SignatureBlocks({
  barangayCaptainName,
  draft,
  signatureImageUrl,
  signatureLabel,
  signatureRole,
}: {
  barangayCaptainName: string;
  draft: boolean;
  signatureImageUrl?: string | null;
  signatureLabel: string;
  signatureRole: string;
}) {
  return (
    <section
      aria-label="Certificate signer block"
      className="mt-10 flex justify-end"
    >
      <div className="w-[4.2in] max-w-full font-serif text-right">
        <p className="mb-2 text-[12pt]">
          {draft ? "Unsigned draft" : signatureLabel}
        </p>
        <div
          data-signature-image-box="true"
          className="flex h-[1.225in] w-full items-end justify-center"
        >
          {draft ? (
            <span className="pb-1 text-[9pt] font-semibold uppercase text-neutral/60">
              Signature applied after signing
            </span>
          ) : signatureImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={signatureImageUrl}
              alt="Authorized official visual signature"
              className="h-full w-full object-contain object-bottom"
            />
          ) : null}
        </div>
        <div
          aria-hidden="true"
          className="mt-[0.1in] ml-auto h-px w-[2.45in] bg-neutral"
          data-signature-line="true"
        />
        {!draft ? (
          <>
            <p className="mt-1 font-semibold uppercase underline decoration-1 underline-offset-1">
              {barangayCaptainName}
            </p>
            <p className="text-xs uppercase">{signatureRole}</p>
          </>
        ) : null}
      </div>
    </section>
  );
}



export function PrintableCertificate({
  barangayCaptainName = "DIOGENES E. MANAOG",
  certificateNumber,
  dateIssued,
  draft = false,
  request,
  signatureImageUrl,
  snapshot,
}: PrintableCertificateProps) {
  const templateData = getCertificateTemplateData(
    request,
    dateIssued,
    snapshot,
  );
  const effectiveCertificateNumber =
    snapshot?.certificate_number ?? certificateNumber;
  const effectiveCaptainName =
    snapshot?.authorized_official_display_name ?? barangayCaptainName;
  const effectiveSignatureRole =
    snapshot?.authorized_official_role ??
    certificateTemplateSignatureRole(request.certificate_type);

  return (
    <article className="print-surface relative mx-auto min-h-[11in] w-[8.5in] max-w-full overflow-hidden rounded-lg border border-base-300 bg-white p-[0.55in] text-neutral shadow-sm">
      {/* TODO: Exact positioning must be revisited with the client before production printing. */}
      {/* TODO: Final production handling may use controlled Supabase Storage assets. */}
      <Watermark certificateType={request.certificate_type} />
      <div className="relative z-10">
        {draft ? (
          <div className="mb-4 border-2 border-dashed border-warning p-2 text-center text-xs font-bold uppercase tracking-normal text-warning">
            Unsigned draft - not issued
          </div>
        ) : null}
        <Header certificateType={request.certificate_type} />
        <h2 className="mt-8 text-center font-serif text-2xl font-bold uppercase tracking-wide text-neutral">
          {certificateTemplateTitle(request.certificate_type)}
        </h2>
        <p className="mt-8 font-serif text-lg font-bold">
          {certificateTemplateSalutation(request.certificate_type)}
        </p>

        {(() => {
          const bodyContent = buildCertificateBodyContent(
            request.certificate_type,
            templateData,
          );
          return (
            <>
              <div className="mt-6 space-y-5 text-justify text-[15px] leading-8">
                {bodyContent.paragraphs.map((paragraph, pIndex) => (
                  <p key={pIndex}>
                    {paragraph.map((part, runIndex) =>
                      part.bold ? (
                        <strong key={runIndex}>{part.text}</strong>
                      ) : (
                        <span key={runIndex}>{part.text}</span>
                      ),
                    )}
                  </p>
                ))}
              </div>

              <p className="mt-8 text-[15px] leading-8">
                {draft ? (
                  <>
                    Selected issue date:{" "}
                    <strong>{templateData.dateIssued}</strong>. Sign and issue
                    this draft to apply the authorized signature.
                  </>
                ) : (
                  bodyContent.issue.map((part, index) =>
                    part.bold ? (
                      <strong key={index}>{part.text}</strong>
                    ) : (
                      <span key={index}>{part.text}</span>
                    ),
                  )
                )}
              </p>
            </>
          );
        })()}

        {request.certificate_type === "barangay_clearance" ? (
          <div className="mt-6 grid grid-cols-2 gap-4 text-xs font-serif">
            <div className="space-y-1">
              <p>CTC No.: ________________________</p>
              <p>DATE OF ISSUED: ________________</p>
              <p>PLACE OF ISSUED: Mauban, Quezon</p>
              <p>O.R. No.: ________________________</p>
            </div>
          </div>
        ) : null}

        <div className="mt-4 grid gap-2 text-xs sm:grid-cols-3">
          <p>
            <span className="font-semibold">Certificate No.:</span>{" "}
            {effectiveCertificateNumber ?? "Assigned when signed"}
          </p>
          <p>
            <span className="font-semibold">Request No.:</span>{" "}
            {request.request_number}
          </p>
          <p>
            <span className="font-semibold">Control No.:</span>{" "}
            {request.control_number ?? "Pending"}
          </p>
        </div>
        <SignatureBlocks
          barangayCaptainName={effectiveCaptainName}
          draft={draft}
          signatureImageUrl={signatureImageUrl}
          signatureLabel={certificateTemplateSignatureLabel(
            request.certificate_type,
          )}
          signatureRole={effectiveSignatureRole}
        />

        <div className="no-print mt-8 rounded border border-dashed border-neutral/40 p-4 text-center text-xs">
          {draft
            ? "Unsigned draft. Signing applies the configured official signature image and printed signer name."
            : signatureImageUrl
            ? "Visual electronic signature for thesis/demo use only; it is not a legally verified digital signature."
            : "No signature image was recorded in this issuance. The saved certificate PDF remains unchanged."}
        </div>
      </div>
    </article>
  );
}
