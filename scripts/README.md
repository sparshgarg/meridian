# scripts

Operational scripts for Meridian data setup. Run with `tsx` (ESM). Scripts that
touch external services (ClickHouse, Postgres, LLM APIs) require a populated
`.env.local` and explicit confirmation before running.

Owner: Person A.

## Run order

1. `npm run db:init` — apply Postgres + ClickHouse schemas (idempotent). Must run
   **before** any data load so the `theme_scores_daily` materialized view
   captures every `mentions` insert.
2. `npm run seed:load` — load design artifacts (accounts, themes, competitors)
   from `/data/seed/*.json` into Postgres. Idempotent when accounts carry stable
   IDs.
3. `npm run seed:generate` — LLM-generate tickets, transcripts, and deals into
   Postgres, using `opportunity-truth.json` to shape the distribution.

## Commands

| Command | What it does |
| --- | --- |
| `npm run db:init` | Create the ClickHouse DB + apply both schema files. |
| `npm run seed:load` | Insert accounts/themes/competitors from JSON. |
| `npm run seed:generate` | Generate all sources (defaults: 900 tickets / 55 transcripts / 200 deals, per the truth table). |
| `npm run seed:dry` | Generate 5 samples per source, print as JSON, no DB writes. |

### Flags (pass after `--`)

- `--source tickets|transcripts|deals|all` — generate one source type (default `all`).
- `--limit N` — cap total generated items (for testing).
- `--dry-run` — 5 samples per source as JSON, no writes (same as `seed:dry`).

Example: `npm run seed:generate -- --source tickets --limit 50`

## Design artifacts (`/data/seed/`)

`--load-seeds` and `--generate` both read these, validated with zod at load time:

- `accounts.json` — `Account[]` (IDs optional; generated if absent).
- `themes.json` — `Theme[]` (slug IDs required).
- `competitors.json` — `Competitor[]` (3-state `features`, one `is_self` row).
- `opportunity-truth.json` — per-theme `target_volume` / `segment_skew` /
  severity+sentiment bias, plus `planted_accounts` (guaranteed requesters).

## Environment

Generation reads the model from env (defaults to OpenAI `gpt-4o-mini`):

- `GEN_PROVIDER` — `openai` (default) or `google`.
- `GEN_MODEL` — model id (default `gpt-4o-mini`; e.g. `gemini-2.0-flash` for google).
- `OPENAI_API_KEY` — required for the default provider.
- `GOOGLE_GENERATIVE_AI_API_KEY` — required when `GEN_PROVIDER=google`.
