# Security and Legal Limitations

This project is a thesis prototype and local demonstration system. It is not
an authorized production government service and must not be presented as one.

- QR verification confirms the recorded issuance and status, but it does not
  prevent photocopying.
- A QR result does not prove that a printed sheet is the only original.
- The displayed signature is a visual thesis/demo placeholder, not a
  cryptographic or legally verified digital signature.
- The mock payment workflow transfers no actual funds and must not collect real
  financial information.
- The demo verification expiry is exactly 72 hours from the actual issuance
  timestamp. It is a thesis/demo policy, not a final legal retention or validity
  rule. Expired and revoked records remain visible for status/audit purposes,
  but resident PDF downloads are denied.
- Local demo authentication is for development and thesis presentation only;
  deployment must use Supabase Auth and reviewed operational controls.
- Real deployment requires official LGU adoption and authorization.
- Real deployment requires a privacy and data-protection review, including data
  retention, access, disclosure, and incident procedures.
- Real deployment requires an approved payment process if online payment is
  retained.
- Real deployment requires an accepted digital-signature policy and authorized
  signature assets.
- Certificate templates, report formats, email content, storage, and office
  procedures require final client approval before production use.
- Supabase certificate issuance is intentionally unavailable until private PDF
  storage, immutable snapshots, public verification, and a reviewed issuer
  service are implemented and tested against the confirmed project.
