import { certificateLabel, formatDate } from "@/lib/utils/format";
import { getCertificateTemplateData } from "@/lib/certificates/template-data";
import type { CertificateRequestWithResident } from "@/lib/certificates/template-data";
import type { CertificateRequest } from "@/types/database";

type PrintableCertificateProps = {
  barangayCaptainName?: string;
  preparedBy: string;
  request: CertificateRequestWithResident;
};

function Header() {
  return (
    <header className="relative text-center">
      {/* TODO: Replace CSS seal placeholders with final production asset handling if approved. */}
      <div className="absolute left-0 top-0 flex size-20 items-center justify-center rounded-full border-2 border-neutral text-[10px] font-bold uppercase leading-tight">
        Bayan ng Mauban
      </div>
      <div className="absolute right-0 top-0 flex size-20 items-center justify-center rounded-full border-2 border-neutral text-[10px] font-bold uppercase leading-tight">
        Barangay Bato
      </div>
      <p className="text-sm uppercase">Republic of the Philippines</p>
      <p className="text-sm">Province of Quezon</p>
      <p className="text-sm">Municipality of Mauban</p>
      <h1 className="mt-2 text-2xl font-bold uppercase tracking-normal">
        Barangay Bato
      </h1>
      <p className="text-sm uppercase">Office of the Punong Barangay</p>
    </header>
  );
}

function Watermark() {
  return (
    <div
      className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-10"
      aria-hidden
    >
      <div className="flex size-[6.5in] items-center justify-center rounded-full border-[10px] border-neutral text-center text-5xl font-black uppercase leading-tight text-neutral">
        Barangay Bato
        <br />
        Mauban, Quezon
      </div>
    </div>
  );
}

function SignatureBlocks({
  barangayCaptainName,
  preparedBy,
}: {
  barangayCaptainName: string;
  preparedBy: string;
}) {
  return (
    <div className="mt-16 grid gap-12 text-center sm:grid-cols-2">
      <div>
        <div className="mx-auto mb-2 h-px w-56 bg-neutral" />
        <p className="font-semibold uppercase">{preparedBy}</p>
        <p className="text-xs uppercase">Prepared By</p>
      </div>
      <div>
        <div className="h-12" />
        <div className="mx-auto mb-2 h-px w-56 bg-neutral" />
        <p className="font-semibold uppercase">{barangayCaptainName}</p>
        <p className="text-xs uppercase">Punong Barangay</p>
      </div>
    </div>
  );
}

function ClearanceBody({
  address,
  age,
  name,
  purpose,
  request,
}: {
  address: string;
  age: string;
  name: string;
  purpose: string;
  request: CertificateRequest;
}) {
  return (
    <>
      <h2 className="mt-10 text-center text-2xl font-black uppercase tracking-normal">
        Certification of Barangay Clearance
      </h2>
      <p className="mt-10 text-lg font-semibold">To whom it may concern:</p>
      <div className="mt-6 space-y-5 text-justify text-[15px] leading-8">
        <p>
          This is to certify that <strong>{name}</strong>, <strong>{age}</strong>{" "}
          years old, resident of <strong>{address}</strong>, Barangay Bato,
          Mauban, Quezon, is personally known to be a person with good moral
          character and has no derogatory record in this office.
        </p>
        <p>
          This certification is issued upon request of the interested party in
          connection with <strong>{purpose}</strong>.
        </p>
      </div>
      <div className="mt-8 grid gap-4 text-sm sm:grid-cols-3">
        <p>
          <span className="font-semibold">Control No.:</span>{" "}
          {request.control_number ?? "Pending"}
        </p>
        <p>
          <span className="font-semibold">Place Issued:</span> Mauban, Quezon
        </p>
        <p>
          <span className="font-semibold">Request No.:</span>{" "}
          {request.request_number}
        </p>
      </div>
    </>
  );
}

function BarangayCertificateBody({
  address,
  age,
  birthDetails,
  name,
  purpose,
  request,
}: {
  address: string;
  age: string;
  birthDetails: string;
  name: string;
  purpose: string;
  request: CertificateRequest;
}) {
  return (
    <>
      <h2 className="mt-10 text-center text-2xl font-black uppercase tracking-normal">
        Pagpapatunay
      </h2>
      <p className="mt-10 text-lg font-semibold">Sa kinauukulan:</p>
      <div className="mt-6 space-y-5 text-justify text-[15px] leading-8">
        <p>
          Pinatutunayan ng tanggapang ito na si <strong>{name}</strong>,{" "}
          <strong>{age}</strong> taong gulang, ay lehitimong naninirahan sa{" "}
          <strong>{address}</strong>, Barangay Bato, Mauban, Quezon.
        </p>
        <p>
          Ang talaang ito ay inihanda batay sa kahilingang isinumite sa sistema.
          Detalye ng kapanganakan: <strong>{birthDetails}</strong>.
        </p>
        <p>
          Ipinagkaloob ang pagpapatunay na ito para sa layuning{" "}
          <strong>{purpose}</strong>.
        </p>
      </div>
      <p className="mt-8 text-sm">
        <span className="font-semibold">Request No.:</span>{" "}
        {request.request_number}
      </p>
    </>
  );
}

function IndigencyBody({
  address,
  age,
  name,
  purpose,
  request,
}: {
  address: string;
  age: string;
  name: string;
  purpose: string;
  request: CertificateRequest;
}) {
  return (
    <>
      <h2 className="mt-10 text-center text-2xl font-black uppercase tracking-normal">
        Certification of the Barangay of Indigency
      </h2>
      <p className="mt-10 text-lg font-semibold">To whom it may concern:</p>
      <div className="mt-6 space-y-5 text-justify text-[15px] leading-8">
        <p>
          This certifies that <strong>{name}</strong>, <strong>{age}</strong>{" "}
          years old, is a bona fide resident of <strong>{address}</strong>,
          Barangay Bato, Mauban, Quezon.
        </p>
        <p>
          The above-named person belongs to an indigent family of the barangay
          and needs this certification for <strong>{purpose}</strong>.
        </p>
        <p>
          This certification is issued upon request for whatever legal purpose it
          may serve.
        </p>
      </div>
      <p className="mt-8 text-sm">
        <span className="font-semibold">Request No.:</span>{" "}
        {request.request_number}
      </p>
    </>
  );
}

function ResidencyBody({
  address,
  age,
  birthday,
  name,
  purpose,
  request,
  yearsOfResidency,
}: {
  address: string;
  age: string;
  birthday: string;
  name: string;
  purpose: string;
  request: CertificateRequest;
  yearsOfResidency: string;
}) {
  return (
    <>
      <h2 className="mt-10 text-center text-2xl font-black uppercase tracking-normal">
        Certification of the Barangay of Residency
      </h2>
      <p className="mt-10 text-lg font-semibold">To whom it may concern:</p>
      <div className="mt-6 space-y-5 text-justify text-[15px] leading-8">
        <p>
          This certifies that <strong>{name}</strong>, <strong>{age}</strong>{" "}
          years old, born on <strong>{birthday}</strong>, is a bona fide resident
          of <strong>{address}</strong>, Barangay Bato, Mauban, Quezon.
        </p>
        <p>
          This document is issued as supporting proof of residency and
          authenticity showing that the applicant has been residing in the
          barangay for <strong>{yearsOfResidency}</strong> year(s) prior to the
          application.
        </p>
        <p>
          This certification is issued for <strong>{purpose}</strong>.
        </p>
      </div>
      <p className="mt-8 text-sm">
        <span className="font-semibold">Request No.:</span>{" "}
        {request.request_number}
      </p>
    </>
  );
}

export function PrintableCertificate({
  barangayCaptainName = "Authorized Barangay Official",
  preparedBy,
  request,
}: PrintableCertificateProps) {
  const templateData = getCertificateTemplateData(request);

  return (
    <article className="print-surface relative mx-auto min-h-[11in] w-[8.5in] max-w-full overflow-hidden rounded-lg border border-base-300 bg-white p-[0.55in] text-neutral shadow-sm">
      {/* TODO: Exact positioning must be revisited with the client before production printing. */}
      {/* TODO: Final production handling may use controlled Supabase Storage assets. */}
      <Watermark />
      <div className="relative z-10">
        <Header />
        <div className="mt-8 text-center text-xs uppercase tracking-normal">
          {certificateLabel(request.certificate_type)}
        </div>

        {request.certificate_type === "barangay_clearance" ? (
          <ClearanceBody
            address={templateData.address}
            age={templateData.age}
            name={templateData.name}
            purpose={templateData.purpose}
            request={request}
          />
        ) : null}
        {request.certificate_type === "barangay_certificate" ? (
          <BarangayCertificateBody
            address={templateData.address}
            age={templateData.age}
            birthDetails={templateData.birthDetails}
            name={templateData.name}
            purpose={templateData.purpose}
            request={request}
          />
        ) : null}
        {request.certificate_type === "barangay_indigency" ? (
          <IndigencyBody
            address={templateData.address}
            age={templateData.age}
            name={templateData.name}
            purpose={templateData.purpose}
            request={request}
          />
        ) : null}
        {request.certificate_type === "barangay_residency" ? (
          <ResidencyBody
            address={templateData.address}
            age={templateData.age}
            birthday={templateData.birthday}
            name={templateData.name}
            purpose={templateData.purpose}
            request={request}
            yearsOfResidency={templateData.yearsOfResidency}
          />
        ) : null}

        <p className="mt-10 text-[15px] leading-8">
          Issued this <strong>{formatDate(new Date().toISOString())}</strong> at
          Barangay Bato, Mauban, Quezon.
        </p>

        <div className="mt-4 grid gap-2 text-xs sm:grid-cols-2">
          <p>
            <span className="font-semibold">Certificate No.:</span> Assigned
            when saved
          </p>
          <p>
            <span className="font-semibold">Request No.:</span>{" "}
            {request.request_number}
          </p>
        </div>

        <SignatureBlocks
          barangayCaptainName={barangayCaptainName}
          preparedBy={preparedBy}
        />

        <div className="mt-8 rounded border border-dashed border-neutral/40 p-4 text-center text-xs">
          Demo Visual Signature: the signer name is a thesis/demo visual
          representation only and is not a legally verified digital signature.
        </div>
      </div>
    </article>
  );
}
