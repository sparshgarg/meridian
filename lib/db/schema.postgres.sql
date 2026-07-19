-- Meridian OLTP schema (Postgres). Mutable state: accounts, deals, themes
-- taxonomy, competitor matrix, plus append-only raw source staging.
--
-- Idempotent: safe to re-run. Extensions/tables use IF NOT EXISTS; enums are
-- guarded; triggers are CREATE OR REPLACE fn + DROP-then-CREATE. Applied by
-- scripts/init-schema.ts (task 8). Owner: Person A.

-- ── Extensions ───────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── updated_at trigger function ──────────────────────────────────────────────
-- Shared by the mutable tables (accounts, deals, themes). The append-only
-- staging tables (raw_tickets, raw_transcripts) deliberately do NOT use this.
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ── Enums ────────────────────────────────────────────────────────────────────
-- CREATE TYPE has no IF NOT EXISTS; guard so re-runs don't error.
DO $$ BEGIN
  CREATE TYPE account_segment AS ENUM ('enterprise', 'mid_market', 'smb');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE theme_category AS ENUM ('billing', 'invoicing', 'tax', 'revrec', 'integrations', 'other');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE deal_status AS ENUM ('won', 'lost', 'in_progress');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── accounts (mutable) ───────────────────────────────────────────────────────
-- Mirrors types/account.ts.
CREATE TABLE IF NOT EXISTS accounts (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                 TEXT NOT NULL,
  industry             TEXT NOT NULL,
  employee_count       INTEGER NOT NULL,
  arr                  NUMERIC(14, 2) NOT NULL DEFAULT 0,
  segment              account_segment NOT NULL,
  health_score         SMALLINT NOT NULL CHECK (health_score BETWEEN 0 AND 100),
  renewal_date         DATE NOT NULL,
  primary_contact_name TEXT NOT NULL,
  primary_contact_role TEXT NOT NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── themes (mutable) ─────────────────────────────────────────────────────────
-- Mirrors types/theme.ts. PK is the slug ThemeId (e.g. 'usage_based_billing'),
-- NOT a UUID — it's the cross-system join key (ClickHouse mentions.theme_id and
-- every agent tool output).
CREATE TABLE IF NOT EXISTS themes (
  id                TEXT PRIMARY KEY,               -- slug ThemeId
  name              TEXT NOT NULL,
  short_description TEXT NOT NULL,
  category          theme_category NOT NULL,
  first_seen_at     DATE NOT NULL,
  last_seen_at      DATE NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── competitors (competitor matrix; ~7 competitors + one self row) ───────────
-- One row per competitor. `features` is a feature_name -> support map where each
-- value is 'full' | 'partial' | 'none' (three-state matrix, rendered as
-- ✅/🟡/❌). The Meridian self row (is_self = true) carries our own support +
-- gap_notes so the agent can derive meridian_has_feature and meridian_gap_notes
-- for get_competitive_position. No updated_at trigger — static reference data.
CREATE TABLE IF NOT EXISTS competitors (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       TEXT NOT NULL UNIQUE,
  is_self    BOOLEAN NOT NULL DEFAULT false,
  features   JSONB NOT NULL DEFAULT '{}'::jsonb,    -- { feature_name: 'full' | 'partial' | 'none' }
  gap_notes  JSONB,                                 -- { feature_name: string }
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── deals (mutable) ──────────────────────────────────────────────────────────
-- Won/lost/in-progress pipeline. `blocking_theme_id` links a lost/stalled deal
-- to the theme that blocked it (powers pipeline_unblocked in get_impact_
-- projection); `competitor_id` records who we lost to.
CREATE TABLE IF NOT EXISTS deals (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id        UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  status            deal_status NOT NULL,
  amount            NUMERIC(14, 2) NOT NULL DEFAULT 0,   -- deal ARR value (USD)
  close_date        DATE,                                -- null while in_progress
  loss_reason       TEXT,                                -- null unless lost
  blocking_theme_id TEXT REFERENCES themes(id) ON DELETE SET NULL,
  competitor_id     UUID REFERENCES competitors(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── raw_tickets (append-only staging) ────────────────────────────────────────
-- Source text for extraction. No updated_at trigger. `opened_at` is the real
-- ticket date (event date, set by the generator); `created_at` is load time.
CREATE TABLE IF NOT EXISTS raw_tickets (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  external_id TEXT NOT NULL UNIQUE,                 -- e.g. 'TICK-00123' (provenance)
  account_id  UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  subject     TEXT NOT NULL,
  body        TEXT NOT NULL,
  status      TEXT,                                 -- open / pending / closed
  priority    TEXT,                                 -- low / medium / high / urgent
  opened_at   TIMESTAMPTZ NOT NULL,                 -- event date
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()    -- audit / load time
);

-- ── raw_transcripts (append-only staging) ────────────────────────────────────
-- Full interview transcripts. Mention char offsets index into `transcript`.
CREATE TABLE IF NOT EXISTS raw_transcripts (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  external_id      TEXT NOT NULL UNIQUE,            -- e.g. 'INT-012' (provenance)
  account_id       UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  title            TEXT NOT NULL,
  interviewee_name TEXT NOT NULL,
  interviewee_role TEXT NOT NULL,
  interview_date   DATE NOT NULL,                   -- event date
  duration_minutes INTEGER,
  transcript       TEXT NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()  -- audit / load time
);

-- ── updated_at triggers (mutable tables only) ────────────────────────────────
DROP TRIGGER IF EXISTS accounts_set_updated_at ON accounts;
CREATE TRIGGER accounts_set_updated_at BEFORE UPDATE ON accounts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS themes_set_updated_at ON themes;
CREATE TRIGGER themes_set_updated_at BEFORE UPDATE ON themes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS deals_set_updated_at ON deals;
CREATE TRIGGER deals_set_updated_at BEFORE UPDATE ON deals
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Indexes ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_accounts_segment           ON accounts (segment);
CREATE INDEX IF NOT EXISTS idx_deals_account_id           ON deals (account_id);
CREATE INDEX IF NOT EXISTS idx_deals_status               ON deals (status);
CREATE INDEX IF NOT EXISTS idx_deals_blocking_theme_id    ON deals (blocking_theme_id);
CREATE INDEX IF NOT EXISTS idx_raw_tickets_account_id     ON raw_tickets (account_id);
CREATE INDEX IF NOT EXISTS idx_raw_transcripts_account_id ON raw_transcripts (account_id);
