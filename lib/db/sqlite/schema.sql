PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,
  auth_user_id TEXT,
  full_name TEXT NOT NULL,
  age INTEGER,
  address_sitio TEXT,
  date_of_birth TEXT,
  civil_status TEXT,
  contact_number TEXT,
  gender TEXT,
  occupation TEXT,
  email TEXT NOT NULL UNIQUE,
  username TEXT UNIQUE,
  password_hash TEXT,
  role TEXT NOT NULL CHECK (role IN ('resident', 'main_admin', 'barangay_secretary')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS certificate_requests (
  id TEXT PRIMARY KEY,
  request_number TEXT NOT NULL UNIQUE,
  resident_id TEXT NOT NULL REFERENCES profiles(id),
  certificate_type TEXT NOT NULL CHECK (certificate_type IN ('barangay_clearance', 'barangay_certificate', 'barangay_indigency', 'barangay_residency')),
  purpose TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'ready_for_pickup', 'ready_for_download', 'done', 'cancelled')),
  remarks TEXT,
  submitted_data TEXT NOT NULL DEFAULT '{}',
  control_number TEXT UNIQUE,
  fee_amount INTEGER NOT NULL DEFAULT 0,
  payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid', 'free')),
  date_requested TEXT NOT NULL DEFAULT (datetime('now')),
  date_accepted TEXT,
  date_released TEXT,
  cancelled_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS pickup_schedules (
  id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL UNIQUE REFERENCES certificate_requests(id),
  pickup_date TEXT NOT NULL,
  pickup_time TEXT NOT NULL,
  remarks TEXT,
  created_by TEXT REFERENCES profiles(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS certificate_records (
  id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL UNIQUE REFERENCES certificate_requests(id),
  certificate_type TEXT NOT NULL,
  resident_id TEXT NOT NULL REFERENCES profiles(id),
  date_issued TEXT NOT NULL,
  prepared_by TEXT REFERENCES profiles(id),
  control_number TEXT,
  template_data TEXT NOT NULL DEFAULT '{}',
  pdf_path TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS activity_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES profiles(id),
  role TEXT NOT NULL,
  action TEXT NOT NULL,
  affected_table TEXT,
  affected_record_id TEXT,
  remarks TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS notification_logs (
  id TEXT PRIMARY KEY,
  request_id TEXT REFERENCES certificate_requests(id),
  recipient_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL,
  provider_response TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS system_settings (
  id TEXT PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS rate_limit_attempts (
  key_hash TEXT PRIMARY KEY,
  action TEXT NOT NULL,
  window_started_at TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS rate_limit_attempts_action_window_idx
  ON rate_limit_attempts (action, window_started_at);

CREATE TABLE IF NOT EXISTS document_counters (
  id TEXT PRIMARY KEY,
  counter_type TEXT NOT NULL CHECK (counter_type IN ('request_number', 'barangay_clearance_control_number')),
  year INTEGER NOT NULL,
  current_value INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (counter_type, year)
);

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL REFERENCES certificate_requests(id),
  resident_id TEXT NOT NULL REFERENCES profiles(id),
  provider TEXT NOT NULL,
  provider_transaction_id TEXT NOT NULL UNIQUE,
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'PHP',
  status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'paid', 'failed', 'cancelled', 'expired', 'refunded', 'free')),
  paid_at TEXT,
  expires_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS payments_request_id_idx ON payments (request_id, created_at DESC);

CREATE TABLE IF NOT EXISTS payment_events (
  id TEXT PRIMARY KEY,
  payment_id TEXT NOT NULL REFERENCES payments(id),
  event_type TEXT NOT NULL,
  payload TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
