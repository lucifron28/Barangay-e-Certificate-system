-- Migration 0003: Manual GCash and Maya payment verification
-- Add payment proof fields and staff review tracking to payments table

ALTER TABLE payments ADD COLUMN submitted_at TEXT;
ALTER TABLE payments ADD COLUMN transaction_datetime TEXT;
ALTER TABLE payments ADD COLUMN proof_storage_provider TEXT;
ALTER TABLE payments ADD COLUMN proof_storage_key TEXT;
ALTER TABLE payments ADD COLUMN proof_sha256 TEXT;
ALTER TABLE payments ADD COLUMN reviewed_at TEXT;
ALTER TABLE payments ADD COLUMN reviewed_by TEXT;
ALTER TABLE payments ADD COLUMN review_remarks TEXT;

CREATE INDEX IF NOT EXISTS payments_status_created_idx ON payments (status, created_at DESC);
CREATE INDEX IF NOT EXISTS payments_reviewed_by_idx ON payments (reviewed_by);

-- Normalize unissued fee-paying requests that were marked paid under legacy simulation back to unpaid
-- so that certificate issuance requires verified GCash/Maya payment proof.
-- Issued historical certificates and their records remain untouched.
UPDATE certificate_requests
SET payment_status = 'unpaid', updated_at = datetime('now')
WHERE fee_amount > 0
  AND payment_status = 'paid'
  AND status = 'accepted'
  AND id NOT IN (
    SELECT request_id FROM certificate_records WHERE status = 'issued'
  );
