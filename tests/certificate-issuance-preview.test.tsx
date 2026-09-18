import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CertificateIssuanceEditor } from "@/components/certificates/certificate-issuance-editor";
import { getRequestById } from "@/lib/db/sqlite/queries";
import { signCertificateSchema } from "@/lib/validations/admin";

describe("certificate issuance preview", () => {
  it("uses the selected issue date in the HTML preview", () => {
    const request = getRequestById("10000000-0000-4000-8000-000000000004");
    expect(request).not.toBeNull();

    const markup = renderToStaticMarkup(
      <CertificateIssuanceEditor
        action={async () => undefined}
        barangayCaptainName="Authorized Barangay Official"
        initialDateIssued="2026-08-19"
        isReissue={false}
        canManageSignerSettings={true}
        signingAvailable={true}
        request={request!}
      />,
    );

    expect(markup).toContain("Selected issue date:");
    expect(markup).toContain("Aug 19, 2026");
    expect(markup).toContain('value="2026-08-19"');
    expect(markup).toContain("Sign &amp; Issue Certificate");
    expect(markup).toContain('name="signing_confirmation" value="sign"');
  });

  it("disables signing and directs the Main Admin to signer settings", () => {
    const request = getRequestById("10000000-0000-4000-8000-000000000004");
    expect(request).not.toBeNull();

    const markup = renderToStaticMarkup(
      <CertificateIssuanceEditor
        action={async () => undefined}
        barangayCaptainName="Authorized Barangay Official"
        initialDateIssued="2026-08-19"
        isReissue={false}
        canManageSignerSettings={true}
        signingAvailable={false}
        request={request!}
      />,
    );

    expect(markup).toContain("Signing is disabled");
    expect(markup).toContain('href="/admin/settings"');
    expect(markup).toContain('disabled=""');
  });

  it("requires an explicit sign confirmation in the server action schema", () => {
    const requestId = "10000000-0000-4000-8000-000000000004";
    const dateIssued = "2026-08-19";

    expect(
      signCertificateSchema.safeParse({
        date_issued: dateIssued,
        request_id: requestId,
        signing_confirmation: "sign",
      }).success,
    ).toBe(true);
    expect(
      signCertificateSchema.safeParse({
        date_issued: dateIssued,
        request_id: requestId,
      }).success,
    ).toBe(false);
  });
});
