# Thesis Defense Checklist

## Environment and Equipment

- [ ] `.env.local` exists and is not committed.
- [ ] `LOCAL_DEMO_SECRET` is stable for the whole demonstration and is at least
      32 characters.
- [ ] `DATABASE_PROVIDER=sqlite` is set.
- [ ] `CERTIFICATE_ISSUANCE_MODE=fully_online_demo` is set.
- [ ] Laptop charger is packed.
- [ ] Phone is charged and available for QR scanning.
- [ ] Phone and laptop are connected to the same network.
- [ ] A reachable LAN URL was tested from the phone.
- [ ] `NEXT_PUBLIC_APP_URL` points to the URL used by the phone.

## Data and Workflow

- [ ] `npm run demo:reset` completed immediately before the final rehearsal.
- [ ] Resident demo credentials were tested.
- [ ] Main Admin demo credentials were tested.
- [ ] Barangay Secretary demo credentials were tested.
- [ ] One fresh request can be submitted.
- [ ] Mock payment success works.
- [ ] Failed/cancelled payment retry works.
- [ ] Valid sample certificate exists.
- [ ] Expired sample certificate exists.
- [ ] Revoked sample certificate exists.
- [ ] Sample PDF hashes match the stored records.
- [ ] Payment history is visible.
- [ ] Activity logs and reports contain sample events.

## Backup and Privacy

- [ ] Backup PDFs are stored outside the repository.
- [ ] Backup screenshots contain synthetic names and data only.
- [ ] No real resident information appears in seed data, screenshots, or
      presentation slides.
- [ ] Official template PDFs remain private and ignored by Git.
- [ ] Browser cache was cleared or a private window was used for rehearsal.

## Quality Gates

- [ ] `npm ci` passes.
- [ ] `npm run demo:reset` passes and prints valid, expired, and revoked URLs.
- [ ] `npm run lint` passes.
- [ ] `npm run typecheck` passes.
- [ ] `npm test` passes with all current Vitest tests (currently 15 files / 69
      tests).
- [ ] `npm run build` passes.
- [ ] Production `npm run start` smoke test passes.
- [ ] QR code was scanned with the phone before presentation day.

The automated command sequence and manual smoke order are also recorded in
[`final-defense-readiness.md`](final-defense-readiness.md).
