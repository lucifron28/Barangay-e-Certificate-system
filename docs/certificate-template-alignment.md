# Historical Certificate Template Alignment

This document records the anonymized layout decisions for the historical PDF
references stored locally under
`docs/client-assets/certificate-templates/original/`. The source PDFs and any
rendered comparison images are private local references and are not committed.

No resident names, signatures, addresses, certificate numbers, CTC numbers, or
receipt numbers from the source PDFs are reproduced here.

## Scope

The current pass aligns the three certificate types with active historical
references:

- `RESIDENCY.pdf` -> Barangay Residency
- `BRGY.CLEARANCE.pdf` -> Barangay Clearance
- `INDIGENCY.pdf` -> Barangay Indigency

`BRGY.CERTIFICATE.PDF` is the separate `PAGPAPATUNAY` information model. It has
no historical-layout counterpart in this pass and remains out of scope.

## Gap Analysis

### Barangay Residency

| Reference element                                                         | Current generated output                                  | Gap                                                                | Implementation decision                                                                                                    | Status                         |
| ------------------------------------------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| Letter page with upper seals and centered government heading              | Shared modern header with text-only circular placeholders | Header hierarchy and seal treatment did not resemble the reference | Use a shared historical header with a stylized local fallback seal because no approved seal asset exists in the repository | Implemented; visual QA pending |
| Blue `OFFICE OF THE BARANGAY CHAIRMAN` heading                            | Generic black office heading                              | Wrong color and hierarchy                                          | Use the historical blue serif office heading                                                                               | Implemented                    |
| `CERTIFICATION OF RESIDENCY` title                                        | Expanded modern title                                     | Title wording differed                                             | Use the historical title wording                                                                                           | Implemented                    |
| Residency statement, supporting-document paragraph, and purpose paragraph | Modern standardized paragraphs                            | Body structure and emphasis differed                               | Use a certificate-specific historical body with dynamic synthetic-safe data and bold field values                          | Implemented                    |
| Single right-side certifying official block                               | Generic two-column signature footer                       | Extra signature area changed the document identity                 | Use one principal certifying official block; keep prepared-by information in secondary verification metadata               | Implemented                    |
| Large faint central seal watermark                                        | Large placeholder ellipse with text                       | Watermark was too generic                                          | Use a large low-contrast fallback watermark; replace with an approved asset when supplied                                  | Implemented; asset pending     |

### Barangay Clearance

| Reference element                                                  | Current generated output                             | Gap                                            | Implementation decision                                                                                    | Status      |
| ------------------------------------------------------------------ | ---------------------------------------------------- | ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ----------- |
| `CERTIFICATION OF CLEARANCE` title                                 | `CERTIFICATION OF BARANGAY CLEARANCE`                | Title wording differed                         | Use the historical title wording                                                                           | Implemented |
| Wider body paragraph area                                          | Narrow shared body width                             | Clearance reference uses a wider composition   | Use a clearance-specific body width and vertical configuration                                             | Implemented |
| CTC No., date issued, place issued, and O.R. No. fields            | Fields were absent from the historical-style area    | Paper traceability fields were not represented | Draw blank printable lines only; do not fabricate values or change the database                            | Implemented |
| One principal certification/signature area with lower paper fields | Generic two-column signature footer                  | Historical signature hierarchy was lost        | Use one principal official block and keep digital metadata secondary                                       | Implemented |
| QR and certificate metadata                                        | Metadata was visually prominent in the shared footer | Digital layer competed with the paper template | Keep certificate number, request number, control number, code, expiry, and QR in a compact secondary block | Implemented |

### Barangay Indigency

| Reference element                                     | Current generated output            | Gap                                            | Implementation decision                                                        | Status                     |
| ----------------------------------------------------- | ----------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------ | -------------------------- |
| Blank first page as the structural reference          | Generic shared layout               | Historical body and spacing differed           | Use page 1 as the only structural reference; populated pages are not generated | Implemented                |
| `CERTIFICATION OF INDIGENCY` title                    | Expanded modern title               | Title wording differed                         | Use the historical title wording                                               | Implemented                |
| Indigency statement, purpose, and issuance paragraphs | Modern standardized paragraphs      | Document meaning and paragraph rhythm differed | Preserve the meaning with professionally corrected grammar and dynamic fields  | Implemented                |
| One right-side certifying official area               | Generic two-column signature footer | Signature placement differed                   | Use one principal certifying official block                                    | Implemented                |
| Large faint central seal watermark                    | Large placeholder ellipse with text | Watermark was too generic                      | Use the shared low-contrast fallback watermark pending an approved asset       | Implemented; asset pending |

## Asset Decision

No approved seal or logo image asset was found in the repository. The renderer
therefore uses a clearly documented stylized fallback for the upper seals and
central watermark. The fallback does not extract or copy artwork from the
private historical PDFs. A future approved Barangay Bato/Municipality of Mauban
asset can replace the fallback without changing certificate business logic.

## Digital Verification Layer

Existing certificate number, request number, control number, prepared-by name,
verification code, expiry, QR link, and thesis/demo disclaimer remain in a
compact secondary footer area. They do not replace the historical CTC or O.R.
fields, which remain blank printable lines when the application has no value.

## Verification Status

The renderer and synthetic regression tests are implemented on the feature
branch. Fresh fictional PDFs were rendered and reviewed side by side with the
private references. The comparison confirmed the shared government heading,
blue office heading, serif body hierarchy, watermark placement, single
certifying-official area, and compact secondary verification layer. Exact seal
artwork remains pending because no approved seal asset exists in the repository.
Repository lint, typecheck, test, and build validation remains the final gate.
