CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS auth_sessions (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES profiles(id),
  token_hash TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL DEFAULT (datetime('now')),
  revoked_at TEXT
);

CREATE INDEX IF NOT EXISTS auth_sessions_profile_id_idx
  ON auth_sessions (profile_id, expires_at DESC);

CREATE TABLE IF NOT EXISTS issuance_reservations (
  id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL REFERENCES certificate_requests(id),
  certificate_record_id TEXT NOT NULL UNIQUE,
  certificate_number TEXT NOT NULL UNIQUE,
  reserved_by TEXT NOT NULL REFERENCES profiles(id),
  status TEXT NOT NULL CHECK (status IN ('reserved', 'finalized', 'released')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  finalized_at TEXT,
  released_at TEXT
);

CREATE INDEX IF NOT EXISTS issuance_reservations_request_idx
  ON issuance_reservations (request_id, status, created_at DESC);

ALTER TABLE certificate_records ADD COLUMN pdf_storage_provider TEXT NOT NULL DEFAULT 'local';

ALTER TABLE certificate_records ADD COLUMN pdf_storage_key TEXT;

CREATE INDEX IF NOT EXISTS certificate_records_storage_key_idx
  ON certificate_records (pdf_storage_provider, pdf_storage_key);
