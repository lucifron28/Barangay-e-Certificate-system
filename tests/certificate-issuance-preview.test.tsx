import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CertificateIssuanceEditor } from "@/components/certificates/certificate-issuance-editor";
import { getRequestById } from "@/lib/db/sqlite/queries";

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
        preparedBy="Demo Main Admin"
        request={request!}
      />,
    );

    expect(markup).toContain("Selected issue date:");
    expect(markup).toContain("Aug 19, 2026");
    expect(markup).toContain('value="2026-08-19"');
  });
});
