# Historical Certificate Template Alignment

This document records the anonymized layout decisions for the historical PDF
references stored locally under
`docs/client-assets/certificate-templates/original/`. The source PDFs and any
rendered comparison images are private local references and are not committed.

No resident names, signatures, addresses, certificate numbers, CTC numbers, or
receipt numbers from the source PDFs are reproduced here.

## Scope

The current pass aligns all four certificate types with active historical
references:

- `RESIDENCY.pdf` -> Barangay Residency
- `BRGY.CLEARANCE.pdf` -> Barangay Clearance
- `BRGY.CERTIFICATE.PDF` -> Barangay Certificate (`PAGPAPATUNAY`)
- `INDIGENCY.pdf` -> Barangay Indigency

The Barangay Certificate reference is a Filipino-language `PAGPAPATUNAY` layout
with the blue `TANGGAPAN NG PUNONG BARANGAY` heading, title, left body copy, and
right-side certifying-official block. The historical/sample PDF also contains
legacy fields such as parent names, residence/address details, land or tax
declarations, and annual income. Those fields are not part of the confirmed
current request model. The generated body intentionally uses only the confirmed
current fields (name, age, place of birth, and purpose) while preserving the
reference's visual and structural identity.

## PAGPAPATUNAY Information Model

This is an intentional adaptation boundary for the thesis/demo. The renderer
does not invent or persist unsupported historical fields simply to reproduce
sample content from the private PDF. Dynamic values come from the current
Barangay Certificate request model; exact official wording, field coverage, and
print positioning remain subject to final client approval.

## Gap Analysis

### Barangay Residency

| Reference element                                                         | Current generated output                                  | Gap                                                                | Implementation decision                                                                                                    | Status                         |
| ------------------------------------------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| Letter page with upper seals and centered government heading              | Shared historical header with text-only circular placeholders | Approved seal artwork is not committed | Use a shared historical header with a stylized local fallback seal because no approved seal asset exists in the repository | Implemented; synthetic visual QA reviewed |
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

### Barangay Certificate (`PAGPAPATUNAY`)

| Reference element                                         | Current generated output                              | Gap                                      | Implementation decision                                                                                         | Status                         |
| --------------------------------------------------------- | ----------------------------------------------------- | ---------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| Filipino government heading and paired upper seals        | Shared historical header with local fallback seals    | Approved seal artwork is not committed   | Use the Filipino heading and clearly marked stylized fallback seals                                             | Implemented; asset pending     |
| Blue `TANGGAPAN NG PUNONG BARANGAY` heading               | Matching Filipino office heading                     | Exact letter spacing and official artwork remain pending | Use a certificate-specific office heading and preserve the reference's blue serif hierarchy                   | Implemented                    |
| `PAGPAPATUNAY` title and `Sa kinauukulan:` salutation     | Matching Filipino title and salutation               | Exact production typography remains pending | Use the supplied Filipino title and salutation                                                                  | Implemented                    |
| Historical legacy body fields                              | Confirmed current fields only                         | Parent, land/tax, and income fields are not confirmed application fields | Preserve the body structure while rendering name, age, place of birth, and purpose from the current request model | Implemented; intentional adaptation |
| Bold dynamic values and bounded paragraph wrapping         | Synthetic-safe bold values with bounded wrapping     | Final official copy and exact positioning remain pending | Keep dynamic output limited to confirmed fields and replace the body copy after client approval if required       | Implemented                    |
| Right-side `Pinatunayan ni:` official block                | Generic two-column signature footer                  | Official block treatment differed         | Use one right-side visual signature block with configurable official name and role                             | Implemented; visual placeholder |

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

The renderer and synthetic regression tests cover all four private references.
Fresh fictional PDFs are rendered and reviewed side by side with the private
references. The comparison confirms the shared government heading, the English
and Filipino office headings, serif body hierarchy, watermark placement, single
certifying-official area, and compact secondary verification layer. The
`PAGPAPATUNAY` body is visually aligned but intentionally adapted to the
confirmed current field model; exact seal artwork and production typography
remain pending because no approved assets or final print sign-off exist in the
repository. Repository lint, typecheck, test, and build validation remains the
final gate.
