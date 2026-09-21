BEGIN;

CREATE TABLE IF NOT EXISTS stj_accounts (
  id text PRIMARY KEY,
  email text NOT NULL UNIQUE,
  name text NOT NULL,
  phone text NOT NULL DEFAULT '',
  account_type text NOT NULL CHECK (account_type IN ('regular','student','business')),
  birthday date,
  password_salt text NOT NULL,
  password_hash text NOT NULL,
  student_profile jsonb NOT NULL DEFAULT '{"status":"not_submitted"}'::jsonb,
  business_profile jsonb NOT NULL DEFAULT '{"status":"not_submitted"}'::jsonb,
  rewards_enrolled boolean NOT NULL DEFAULT false,
  rewards_consent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS stj_sessions (
  token_hash text PRIMARY KEY,
  account_id text NOT NULL REFERENCES stj_accounts(id) ON DELETE CASCADE,
  csrf_token_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS stj_sessions_account_idx ON stj_sessions(account_id);
CREATE INDEX IF NOT EXISTS stj_sessions_expiry_idx ON stj_sessions(expires_at);

CREATE TABLE IF NOT EXISTS stj_favorites (
  account_id text NOT NULL REFERENCES stj_accounts(id) ON DELETE CASCADE,
  product_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (account_id, product_id)
);

CREATE TABLE IF NOT EXISTS stj_saved_mixes (
  id text PRIMARY KEY,
  account_id text NOT NULL REFERENCES stj_accounts(id) ON DELETE CASCADE,
  name text NOT NULL,
  selections jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS stj_saved_mixes_account_idx ON stj_saved_mixes(account_id, created_at DESC);

CREATE TABLE IF NOT EXISTS stj_addresses (
  id text PRIMARY KEY,
  account_id text NOT NULL REFERENCES stj_accounts(id) ON DELETE CASCADE,
  label text NOT NULL,
  street text NOT NULL,
  city text NOT NULL,
  state text NOT NULL,
  postal_code text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS stj_reward_ledger (
  id text PRIMARY KEY,
  account_id text NOT NULL REFERENCES stj_accounts(id) ON DELETE CASCADE,
  transaction_type text NOT NULL CHECK (transaction_type IN ('earn','redeem','birthday','adjustment','refund_reversal')),
  points integer NOT NULL CHECK (points <> 0),
  source_id text,
  reason text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS stj_reward_ledger_source_unique
  ON stj_reward_ledger(account_id, transaction_type, source_id)
  WHERE source_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS stj_reward_ledger_account_idx ON stj_reward_ledger(account_id, created_at DESC);

CREATE TABLE IF NOT EXISTS stj_reward_grants (
  id text PRIMARY KEY,
  account_id text NOT NULL REFERENCES stj_accounts(id) ON DELETE CASCADE,
  source_id text,
  kind text NOT NULL,
  reward_id text,
  reward_type text NOT NULL,
  reward_value jsonb,
  status text NOT NULL CHECK (status IN ('available','redeemed','expired','void')),
  issued_at timestamptz NOT NULL DEFAULT now(),
  redeemed_at timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS stj_reward_grants_source_unique
  ON stj_reward_grants(account_id, source_id)
  WHERE source_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS stj_reservations (
  id text PRIMARY KEY,
  account_id text NOT NULL REFERENCES stj_accounts(id) ON DELETE CASCADE,
  purpose text NOT NULL CHECK (purpose IN ('study_group','work_group','meeting','social','other')),
  reservation_date date NOT NULL,
  start_time time NOT NULL,
  duration_minutes integer NOT NULL CHECK (duration_minutes BETWEEN 30 AND 240),
  party_size integer NOT NULL CHECK (party_size BETWEEN 2 AND 40),
  organization text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  status text NOT NULL CHECK (status IN ('requested','confirmed','declined','canceled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS stj_reservations_account_idx ON stj_reservations(account_id, reservation_date DESC);
CREATE INDEX IF NOT EXISTS stj_reservations_schedule_idx ON stj_reservations(reservation_date, start_time)
  WHERE status IN ('requested','confirmed');

CREATE TABLE IF NOT EXISTS stj_account_orders (
  account_id text NOT NULL REFERENCES stj_accounts(id) ON DELETE CASCADE,
  order_id text NOT NULL,
  attached_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (account_id, order_id)
);

COMMIT;
