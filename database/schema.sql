-- ST. JUICE Phase 2 persistence schema
-- PostgreSQL 15+ target. No proposal reward economics are stored here.

BEGIN;

CREATE TABLE IF NOT EXISTS accounts (
  id text PRIMARY KEY,
  email text NOT NULL,
  name text NOT NULL,
  phone text NOT NULL DEFAULT '',
  account_type text NOT NULL CHECK (account_type IN ('regular','student','business')),
  birthday date,
  password_salt text NOT NULL,
  password_hash text NOT NULL,
  email_verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS accounts_email_lower_unique ON accounts ((lower(email)));

CREATE TABLE IF NOT EXISTS account_sessions (
  id uuid PRIMARY KEY,
  account_id text NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  token_digest text NOT NULL UNIQUE,
  csrf_digest text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS account_sessions_account_idx ON account_sessions(account_id);
CREATE INDEX IF NOT EXISTS account_sessions_expiry_idx ON account_sessions(expires_at);

CREATE TABLE IF NOT EXISTS account_favorites (
  account_id text NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  product_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (account_id, product_id)
);

CREATE TABLE IF NOT EXISTS saved_mixes (
  id text PRIMARY KEY,
  account_id text NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name text NOT NULL,
  selections jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS saved_mixes_account_idx ON saved_mixes(account_id, created_at DESC);

CREATE TABLE IF NOT EXISTS saved_addresses (
  id text PRIMARY KEY,
  account_id text NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  label text NOT NULL,
  street text NOT NULL,
  city text NOT NULL,
  state text NOT NULL,
  postal_code text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS student_verifications (
  account_id text PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('not_submitted','pending_manual_review','verified','declined','expired')),
  school_email text,
  institution text,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  expires_at timestamptz,
  reviewer_reference text
);

CREATE TABLE IF NOT EXISTS business_profiles (
  account_id text PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('not_submitted','pending_review','approved','declined')),
  company text,
  role text,
  recurring_cadence text,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  reviewer_reference text
);

CREATE TABLE IF NOT EXISTS rewards_enrollment (
  account_id text PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
  enrolled boolean NOT NULL DEFAULT false,
  consent_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reward_ledger (
  id text PRIMARY KEY,
  account_id text NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  transaction_type text NOT NULL CHECK (transaction_type IN ('earn','redeem','birthday','adjustment','refund_reversal')),
  points integer NOT NULL CHECK (points <> 0),
  source_id text,
  reason text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS reward_ledger_account_idx ON reward_ledger(account_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS reward_ledger_idempotency_unique
  ON reward_ledger(account_id, transaction_type, source_id)
  WHERE source_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS reward_grants (
  id text PRIMARY KEY,
  account_id text NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  source_id text,
  kind text NOT NULL CHECK (kind IN ('loyalty_redemption','birthday','manual')),
  reward_id text,
  reward_type text NOT NULL,
  value_json jsonb,
  status text NOT NULL CHECK (status IN ('available','consumed','expired','revoked')),
  issued_at timestamptz NOT NULL DEFAULT now(),
  redeemed_at timestamptz,
  expires_at timestamptz
);
CREATE INDEX IF NOT EXISTS reward_grants_account_idx ON reward_grants(account_id, status, issued_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS reward_grants_source_unique
  ON reward_grants(account_id, source_id)
  WHERE source_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS reservations (
  id text PRIMARY KEY,
  account_id text NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  purpose text NOT NULL CHECK (purpose IN ('study_group','work_group','meeting','social','other')),
  reservation_date date NOT NULL,
  start_time time NOT NULL,
  duration_minutes integer NOT NULL CHECK (duration_minutes BETWEEN 30 AND 240 AND duration_minutes % 30 = 0),
  party_size integer NOT NULL CHECK (party_size BETWEEN 2 AND 40),
  organization text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  status text NOT NULL CHECK (status IN ('requested','confirmed','declined','canceled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS reservations_account_idx ON reservations(account_id, reservation_date DESC, start_time);
CREATE INDEX IF NOT EXISTS reservations_schedule_idx ON reservations(reservation_date, start_time, status);

CREATE TABLE IF NOT EXISTS account_orders (
  account_id text NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  order_id text NOT NULL,
  linked_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (account_id, order_id)
);

CREATE TABLE IF NOT EXISTS account_audit_events (
  id uuid PRIMARY KEY,
  account_id text REFERENCES accounts(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS account_audit_events_account_idx ON account_audit_events(account_id, created_at DESC);

COMMIT;
