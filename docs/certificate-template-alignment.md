# Certificate Template Alignment

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

This is an intentional client-preview adaptation boundary. The renderer
does not invent or persist unsupported historical fields simply to reproduce
sample content from the private PDF. Dynamic values come from the current
Barangay Certificate request model; exact official wording, field coverage, and
print positioning remain subject to final client approval.

## Gap Analysis

### Barangay Residency

| Reference element                                                         | Current generated output                                  | Gap                                                                | Implementation decision                                                                                                    | Status                         |
| ------------------------------------------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| Letter page with upper seals and centered government heading              | Shared historical header with the supplied circular Mauban and Barangay Bato seal assets | Exact final size and print positioning remain to be approved | Use the processed transparent seal assets in both the HTML preview and downloaded PDF, with a fallback when an asset is unavailable | Implemented; final print approval pending |
| Blue `OFFICE OF THE BARANGAY CHAIRMAN` heading                            | Generic black office heading                              | Wrong color and hierarchy                                          | Use the historical blue serif office heading                                                                               | Implemented                    |
| `CERTIFICATION OF RESIDENCY` title                                        | Expanded modern title                                     | Title wording differed                                             | Use the historical title wording                                                                                           | Implemented                    |
| Residency statement, supporting-document paragraph, and purpose paragraph | Modern standardized paragraphs                            | Body structure and emphasis differed                               | Use a certificate-specific historical body with dynamic synthetic-safe data and bold field values                          | Implemented                    |
| Single right-side certifying official block                               | Generic two-column signature footer                       | Extra signature area changed the document identity                 | Use one principal certifying official block; keep prepared-by information in secondary verification metadata               | Implemented                    |
| Large faint central seal watermark                                        | Large supplied Barangay Bato seal at low opacity          | Exact final size and print positioning remain to be approved         | Use the supplied Barangay Bato seal as the centered low-contrast watermark, with a text fallback only if the asset is unavailable | Implemented; final print approval pending |

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
| Large faint central seal watermark                    | Large supplied Barangay Bato seal at low opacity | Watermark was too generic                      | Use the supplied Barangay Bato seal as the centered low-contrast watermark, with a text fallback only if the asset is unavailable | Implemented; final print approval pending |

### Barangay Certificate (`PAGPAPATUNAY`)

| Reference element                                         | Current generated output                              | Gap                                      | Implementation decision                                                                                         | Status                         |
| --------------------------------------------------------- | ----------------------------------------------------- | ---------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| Filipino government heading and paired upper seals        | Shared historical header with the supplied circular Mauban and Barangay Bato seal assets    | Exact final size and print positioning remain to be approved   | Use the Filipino heading and processed seal assets while preserving the reference's paired-seal structure                                             | Implemented; final print approval pending     |
| Blue `TANGGAPAN NG PUNONG BARANGAY` heading               | Matching Filipino office heading                     | Exact letter spacing and official artwork remain pending | Use a certificate-specific office heading and preserve the reference's blue serif hierarchy                   | Implemented                    |
| `PAGPAPATUNAY` title and `Sa kinauukulan:` salutation     | Matching Filipino title and salutation               | Exact production typography remains pending | Use the supplied Filipino title and salutation                                                                  | Implemented                    |
| Historical legacy body fields                              | Confirmed current fields only                         | Parent, land/tax, and income fields are not confirmed application fields | Preserve the body structure while rendering name, age, place of birth, and purpose from the current request model | Implemented; intentional adaptation |
| Bold dynamic values and bounded paragraph wrapping         | Synthetic-safe bold values with bounded wrapping     | Final official copy and exact positioning remain pending | Keep dynamic output limited to confirmed fields and replace the body copy after client approval if required       | Implemented                    |
| Right-side `Pinatunayan ni:` official block                | Generic two-column signature footer                  | Official block treatment differed         | Use one right-side visual signature block with configurable official name and role                             | Implemented; visual placeholder |

## Asset Decision

The client supplied Barangay Bato and Municipality of Mauban seal images. The
repository stores circular, transparent PNG derivatives at
`public/branding/barangay-bato-seal.png` and
`public/branding/mauban-seal.png`. The original square source images are not
used directly. The browser certificate preview and historical PDF renderer use
these assets in the paired upper header. If either file is unavailable, the
PDF renderer keeps its text-based fallback so a missing static asset does not
break issuance.

The central watermark now uses the same supplied Barangay Bato seal as the
historical references, scaled per certificate type and rendered at low opacity
behind the certificate text. The clearance reference uses the larger seal
treatment; the Certificate, Indigency, and Residency references use the smaller
shared treatment. A text-based fallback remains for missing local assets. Exact
watermark dimensions, opacity, print positioning, and final production asset
handling still need print approval. Approved assets may move to Supabase Storage
in a later deployment model without changing certificate business logic.

## Digital Verification Layer

Existing certificate number, request number, control number, prepared-by name,
verification code, expiry, QR link, and system-record disclaimer remain in a
compact secondary footer area. They do not replace the historical CTC or O.R.
fields, which remain blank printable lines when the application has no value.

## Verification Status

The renderer and synthetic regression tests cover all four private references.
Fresh fictional PDFs are rendered and reviewed side by side with the private
references. The comparison confirms the shared government heading, the English
and Filipino office headings, paired supplied seals, serif body hierarchy,
watermark placement, single certifying-official area, and compact secondary
verification layer. The `PAGPAPATUNAY` body is visually aligned but
intentionally adapted to the confirmed current field model. Exact seal sizing,
print positioning, and production typography remain subject to final print
approval. Repository lint, typecheck, test, and build validation remains the
final gate.
