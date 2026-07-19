-- Meridian OLAP schema (ClickHouse). Analytical layer: the unified extracted
-- theme-mention signal plus a daily per-theme rollup as a materialized view.
--
-- Idempotent: CREATE TABLE / CREATE MATERIALIZED VIEW IF NOT EXISTS everywhere.
-- Table names are unqualified — they resolve to the connection's database
-- (CLICKHOUSE_DATABASE=meridian). scripts/init-schema.ts (task 8) must ensure
-- that database exists BEFORE applying this file. Owner: Person A.

-- ── mentions ─────────────────────────────────────────────────────────────────
-- Mirrors types/mention.ts. The unified, aggregation-optimized theme signal
-- across tickets, transcripts, and deal losses. ORDER BY (theme_id, event_date)
-- serves the dominant access pattern (a theme's signal over time); the
-- account_id bloom-filter skip index accelerates per-account drill-downs.
-- account_arr and account_segment are denormalized so segment/ARR aggregations
-- (n_enterprise_accounts, ARR-weighted demand) never need a Postgres join.
CREATE TABLE IF NOT EXISTS mentions (
  mention_id        UUID,
  theme_id          LowCardinality(String),
  source_type       Enum8('ticket' = 1, 'transcript' = 2, 'deal_loss' = 3),
  source_id         String,
  account_id        UUID,
  account_arr       Float64,
  account_segment   Enum8('enterprise' = 1, 'mid_market' = 2, 'smb' = 3),
  severity          UInt8,
  sentiment         Int8,
  verbatim_snippet  String,
  char_offset_start UInt32,
  char_offset_end   UInt32,
  extracted_at      DateTime,
  event_date        Date,
  INDEX idx_account_id account_id TYPE bloom_filter GRANULARITY 1
)
ENGINE = MergeTree
PARTITION BY toYYYYMM(event_date)
ORDER BY (theme_id, event_date);

-- ── theme_scores_daily (materialized view) ───────────────────────────────────
-- Daily per-theme rollup, maintained incrementally by ClickHouse on every
-- INSERT into mentions — no refresh job. SummingMergeTree collapses the daily
-- rows on merge; all value columns are additive by construction.
-- NOTE: create this BEFORE loading mentions so it captures every insert. (No
-- POPULATE — that only backfills at creation and can miss concurrent writes.)
CREATE MATERIALIZED VIEW IF NOT EXISTS theme_scores_daily
ENGINE = SummingMergeTree
PARTITION BY toYYYYMM(event_date)
ORDER BY (theme_id, event_date)
AS
SELECT
  theme_id,
  event_date,
  count()                             AS mention_count,
  countIf(source_type = 'ticket')     AS tickets,
  countIf(source_type = 'transcript') AS transcripts,
  countIf(source_type = 'deal_loss')  AS deal_losses,
  sum(toUInt64(severity))             AS total_severity,
  sum(account_arr)                    AS sum_account_arr,
  countIf(sentiment = -1)             AS n_negative
FROM mentions
GROUP BY theme_id, event_date;
