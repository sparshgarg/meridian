# Meridian — Project Context & Handoff

**ClickHouse & Trigger.dev Virtual Summer Hackathon 2026**
**Sole-developer project · Sparsh owns frontend, backend, data, agent, and deployment**
**Repo:** github.com/sparshgarg/meridian
**Deadline:** submissions close midnight AoE, July 23, 2026

This document is the single source of truth for where the project stands. Read it top to bottom before doing any work.

---

## 1. What Meridian is

A chat agent for PMs at a fictional B2B SaaS company ("Meridian Payments," a Stripe-style payments company). The user is a PM on the Billing team preparing for Q4 planning. They ask questions like "what should we prioritize next quarter?" and the agent answers by reading across support tickets, customer interview transcripts, CRM deal data, and competitive intelligence.

**Responses are visual-first** — charts, matrices, evidence cards — not walls of text. This is the hackathon theme: "Beyond the Wall of Text." The judging lens is "ratio of insight to words."

### The demo narrative (the "opportunity truth")
The agent must correctly identify, from the seeded data:
1. **Usage-based billing enhancements** — #1 recommendation (`build_now`). Enterprise ARR, competitive urgency (Metronome/Orb ahead), blocked deals.
2. **Multi-entity consolidated invoicing** — #2 hidden gem (`build_next`). Small footprint but top-15 enterprise accounts, greenfield (no competitor has it).
3. **Dunning email customization** — correctly **deprioritized** despite highest raw ticket volume (mostly SMB accounts, no enterprise deals blocked). This is the "volume trap."
4. **LATAM tax handling** — originally framed as `watch` (Q1); **live data lands `deprioritize`** (signal 23 < 35 threshold). Not a bug — left untuned. Webhook reliability is the live `watch` (#3).
5. Hybrid RevRec, Salesforce sync, custom invoice PDFs — backlog.

### Three "wow" moments the demo must land
1. **Volume-trap detection** — dunning has the most tickets but the agent correctly does NOT rank it #1 (it's SMB-driven, low ARR).
2. **Hidden-gem surfacing** — multi-entity invoicing ranks #2 despite low volume because requesters are high-ARR enterprise.
3. **Provenance drill-down** — every claim traces back to exact source quotes (tickets, transcripts, deals).

---

## 2. Architecture

### Data layer (OLTP + OLAP — targeting the €1000 bonus prize)
- **Postgres (OLTP)** — mutable business records. Provisioned as a **ClickHouse-managed Postgres service** (not Neon — we switched to ClickHouse's managed Postgres so both databases live in one platform, which strengthens the OLTP+OLAP integration story). Holds: `accounts`, `deals`, `themes`, `competitors`, `raw_tickets`, `raw_transcripts`.
- **ClickHouse (OLAP)** — analytical store. Holds: `mentions` (the big append-only table, **1,802 rows** live — ~5k was an early aspirational estimate), `theme_scores_daily` (materialized view). Every agent query is an aggregation over this.

**Why both:** Postgres answers "current state of this account/deal" (transactional lookups on mutable data); ClickHouse answers "across all signal, what matters most?" (analytical aggregation). The Phase A4 sync task propagates changed fields (e.g. account ARR) from Postgres → ClickHouse to keep aggregations current. This is the textbook OLTP+OLAP pattern the bonus prize rewards.

### Agent layer
- **Trigger.dev `chat.agent()`** — REQUIRED by the hackathon. The agent orchestration must use this primitive, not a raw Next.js route or bare Vercel AI SDK. Background jobs (ingestion, extraction, sync) also run as Trigger.dev tasks with `batchTrigger` for fan-out.
- **Orchestration decision: HYBRID** — scripted chapter sequence for the main "what should we prioritize?" flow (for demo reliability), LLM-driven for follow-up questions. LLM reasoning goes into synthesis WITHIN each chapter (verdict text, callouts), not the sequencing between chapters.
- **Progressive disclosure (2026-07-21):** the initial prioritization answer is only a compact ranking + impact chart and ends with `You should prioritize usage-based billing.` Volume trap, hidden gem evidence, competitor matrix, and impact assumptions are separate typed deep dives that issue fresh agent requests and database queries.
- **Hybrid data chat (2026-07-21):** only the exact polished prioritization prompt and typed deep-dive actions use deterministic flows. Every other prompt is sent through the deployed Trigger.dev `meridian-chat` `chat.agent()`, whose LLM selects safe typed tools; no model-generated SQL is accepted.

### Frontend + streaming (Person B, DONE; live seam wired)
- Next.js 14 App Router + TypeScript strict + Tailwind + Recharts + framer-motion.
- The frontend consumes an **NDJSON stream of typed `StreamEvent`s** (defined in `types/chapter.ts`), NOT raw Trigger.dev tool-call events.
- **The integration seam:** `createAgentStream(body: ChatRequest): AsyncGenerator<StreamEvent>` in `lib/agent-stream.ts` — **implemented** (Trigger `stream-meridian-answer` + in-process fallback). Person B owns NDJSON encoding (`app/api/chat/ndjson.ts`) + route wiring (`route.ts` branches on `NEXT_PUBLIC_AGENT_MODE`).
- Reference for exact event ordering/pacing: `app/api/chat/mock/stream.ts` and `app/api/chat/mock/scenarios.ts`.

### LLM provider: Google Gemini (free tier)
- We switched from OpenAI to **Google Gemini** via `@ai-sdk/google` to use the free tier (no funded OpenAI key needed).
- Free tier: Gemini 2.5 Flash = 1,500 requests/day, 15 RPM, 1M TPM. Flash-Lite = 30 RPM. Pro models are NOT free (moved to paid April 2026).
- **Use Flash-Lite for generation, Flash for extraction and agent synthesis.**
- **Critical constraint:** the 15 RPM limit means the generator's concurrency must be LOWERED (from 5 to ~2-3) with 429-retry backoff, or it will hit the rate wall mid-run. You effectively get ONE full generation run per day on the free tier — so get the dry-run right before the full run.
- Env var: `GOOGLE_GENERATIVE_AI_API_KEY`.

---

## 3. THE STREAMEVENT CONTRACT (critical for Person A's agent work)

The frontend and agent communicate over a stream of typed `StreamEvent`s. Full types in `types/chapter.ts`. The union:

```ts
type StreamEvent =
  | { type: 'message_start'; message_id: string }
  | { type: 'status'; status: StatusUpdate }
  | { type: 'chapter_start'; chapter_id: string; title: string; icon: ChapterIcon }
  | { type: 'chapter_intro_delta'; chapter_id: string; delta: string }
  | { type: 'chapter_visual'; chapter_id: string; visual: ChapterVisual }
  | { type: 'chapter_callout'; chapter_id: string; callout: Callout }
  | { type: 'chapter_actions'; chapter_id: string; actions: VisualAction[] }
  | { type: 'message_end'; message_id: string; headline: string }
  | { type: 'error'; message: string };
```

**Per-chapter event order (must honor):** `chapter_start` → `chapter_intro_delta`* → `chapter_visual` → (`chapter_callout` | `chapter_actions`)*. Bracketed by `message_start` / `message_end{headline}`, with `status` events interleaved per query.

`ChatRequest` can include `action: { type: 'deep_dive'; id: DeepDiveId; theme_id? }`. Current IDs are `why_usage`, `why_not_dunning`, `explore_multi_entity`, `competitor_insight`, and `impact_details`. The client preserves conversation history and sends a new `POST /api/chat` for every click; actions are never client-only reveals.

### The 7 visuals (ChapterVisual discriminated union)
Four are **pass-through** — their `data` is literally Person A's tool output from `types/agent-tools.ts`, no reshaping:
- `opportunity_ranking` ← `ListOpportunitiesOutput`
- `evidence_cards` ← `GetThemeEvidenceOutput`
- `competitor_matrix` ← `GetCompetitivePositionOutput`
- `impact_waterfall` ← `GetImpactProjectionOutput`

Three are **frontend-shaped** — transforms in `lib/queries/transforms.ts` (`toStatRow` / `toVolumeTrap` / `toTrendLines`). Aggregate inputs produced by `lib/queries/signal-summary.ts` (verified live):
- `stat_row` ← `SignalSummary`
- `volume_trap` ← `ThemeVolumeStat[]`
- `trend_lines` ← `ThemeTrend[]`

---

## 4. What is DONE (verified)

### Live data (re-counted 2026-07-20 night)
| Store | Metric | Count |
| --- | --- | ---: |
| Postgres | accounts | 123 |
| Postgres | raw_tickets | 956 |
| Postgres | raw_transcripts | 63 |
| Postgres | deals (lost) | 14 (11) |
| ClickHouse | mentions | **1,802** |
| ClickHouse | dunning mentions | 582 |

### Backend foundation (Phases A1–A5 code on `main`)
- Schemas + clients (`lib/db/*`), seed generator (`scripts/seed/*`), seed JSON under `data/seed/`
- Extraction pipeline + Trigger tasks (`lib/extraction/*`, `trigger/extract-mentions.ts`) — Trigger.dev SDK **v4.5.5**
- Queries + scoring (`lib/queries/*`) — **`build_next` floor = 53** in `opportunity-scoring.ts`
- Agent stream: `lib/agent-stream.ts` + `lib/agent/prioritize-flow.ts` + `trigger/agent.ts` (`chat.agent` `meridian-chat`) + `trigger/streams.ts`
- A4: `trigger/sync-oltp-to-olap.ts` + `docs/architecture.md`
- A5 materials: MIT `LICENSE`, rewritten `README.md`, `SUBMISSION.md` with real counts
- E2E: `scripts/e2e-live-stream.ts` — 85 events / 6 chapters / three wow moments (passed)

### Frontend — DONE
- Full UI in mock and live mode; progressive-disclosure actions render as accessible buttons attached to visual modules.
- Live path ready: `route.ts` → `createAgentStream` when `NEXT_PUBLIC_AGENT_MODE=live` (defaults to `mock` if unset).
- Transforms: `lib/queries/transforms.ts`.

### Progressive-disclosure redesign ✅ VERIFIED (2026-07-21)
- Initial prioritize flow: exactly **2 visual modules** (top-four opportunity landscape + compact impact waterfall), no generic intro prose, exact headline `You should prioritize usage-based billing.`
- Initial response does **not** query/render dunning trap, multi-entity evidence, competitor matrix, or account-level impact assumptions.
- Typed action contract added across `/types/chapter.ts`, live/mock streams, `use-chat`, canvas, and charts.
- Each action creates a new request and focused one-chapter response. Live E2E verified all five actions with fresh ClickHouse status events.
- Browser verified actual button clicks and payloads for `why_not_dunning` and `explore_multi_entity`; both produced new `POST /api/chat` requests with full conversation history and the expected typed `action.id`.
- `impact_waterfall` now stays summary-only; `impact_breakdown` shows account-level assumptions only after its deep-dive request.
- Verification passed: `npm run typecheck`, `npm run build`, and `npx tsx scripts/e2e-live-stream.ts`.

### General data chat + deep-dive navigation ✅ VERIFIED (2026-07-21)
- Root cause repaired: `pickFlowKind()` previously returned `prioritize` for every unmatched prompt, and the live `stream-meridian-answer` task always called `runAgentFlow()` instead of invoking the registered `chat.agent()`. This made arbitrary questions look live while returning the global scripted answer.
- Routing is now explicit: exact main-demo prompt / typed actions → scripted Trigger task; all other prompts → server-side `AgentChat` → deployed `meridian-chat` `chat.agent()` → typed tools → the existing `StreamEvent` canvas contract.
- Safe tools: `find_accounts` (parameterized Postgres identity lookup), `get_account_signals` (ClickHouse account themes/evidence + Postgres deal context), theme trends, competitive position, ranked opportunities, theme evidence, and impact. There is no free-form SQL tool.
- Added the reusable `account_snapshot` visual and broader supported suggestions (account, trends, competitors, evidence, prioritization).
- Figma is now a real seeded/live enterprise account (renamed from the prior design-tools fixture so account count is unchanged): $310K ARR, 12 ClickHouse signals, 9 usage-based mentions, one multi-entity mention, and a $218,032 in-progress usage-billing deal. Source cards include `TICK-00048` and `TICK-00121`.
- Unknown accounts return an explicit no-match headline after `find_accounts`; they never fall back to prioritization.
- Deep dives use a typed client navigation stack. Back restores the cached parent turn and scroll position without a request; nested parent/child history and browser Back are supported.
- Browser E2E passed for prioritize → competitor → Back and prioritize → dunning → Back, asserting each deep dive adds one POST while each Back adds zero.
- Local live prompts verified: prioritize (2 scripted modules), Figma (account snapshot + traceable evidence), fastest-growing themes (trend visual), competitors (matrix), and unknown account (honest no-data). Production browser verification covers Figma plus both Back paths.
- Verification passed: `npm run typecheck`, `npm run test:navigation`, `npm run build`, and Playwright `tests/answer-navigation.spec.ts`.

### Environment (DONE locally + Sparsh Vercel Production)
- `.env.local` has ClickHouse, Postgres (ClickHouse-managed), multi-provider LLM keys, and `NEXT_PUBLIC_AGENT_MODE=live` locally.
- **Vercel Production is on Sparsh's account** — project `meridian` under `sparshgarg98-2119s-projects`. Production URL: `https://meridian-blush-iota.vercel.app`. Production env vars set (including `NEXT_PUBLIC_AGENT_MODE=live`) and deployed 2026-07-21. Homepage 200 + live `/api/chat` NDJSON smoke OK.
- **Superseded:** teammate URL `https://meridian-mu-beryl.vercel.app` is no longer the deployment target — use Sparsh's Production URL above.
- Trigger Cloud env must also have DB + `ANTHROPIC_API_KEY` (Sparsh / Trigger dashboard).
- Multi-provider generation/extraction wiring done (Anthropic used for full seed; Groq/others available).

### Seed artifacts (committed)
- 123 accounts / 8 themes / 8 competitors / opportunity-truth with planted blocked deals.

---

## 5. IMMEDIATE NEXT STEPS (in order)

### Step 0 — Switch generator from OpenAI to Gemini ✅ DONE
- [x] `scripts/seed/llm.ts` now defaults to `@ai-sdk/google` + `gemini-2.0-flash-lite` (env-overridable via `GEN_PROVIDER`/`GEN_MODEL`). Single `getModelName()` source of truth.
- [x] Concurrency lowered 5→2 (`GEN_CONCURRENCY`, default 2). Added a **global RPM pace-gate** (`GEN_MIN_INTERVAL_MS`, default 2100ms ≈ 28/min) — caps the request *rate*, not just in-flight count.
- [x] `withRetry` upgraded to **429-aware backoff** (5→60s for rate limits, 1→4s for transient) with jitter.
- [x] `.env.example` documents `GOOGLE_GENERATIVE_AI_API_KEY` + generation tuning knobs; OpenAI/Anthropic marked optional.
- **Two infra fixes discovered while running (both flagged to Person A):**
  - [x] `lib/db/postgres.ts` — newer `pg` treats `sslmode=require` as verify-full and rejects ClickHouse-managed Postgres's cert; now strips `sslmode` from the URL and sets `ssl:{rejectUnauthorized:false}` (honors `sslmode=disable`).
  - [x] `scripts/init-schema.ts` — ClickHouse statement splitter now strips `--` line comments before splitting on `;` (a comment contained a semicolon → "Empty query").

### Step 1 — Run the data pipeline (finishes Phase A1)
1. [x] `npm run db:init` — ✅ Postgres (6 tables/3 triggers/4 enums) + ClickHouse `meridian` DB (mentions + theme_scores_daily MV) applied.
2. [x] `npm run seed:load` — ✅ 123 accounts / 8 themes / 8 competitors in Postgres.
3. [x] `npm run seed:dry` — ✅ **PASSED quality gate.** Switched generation provider to **Anthropic Claude Haiku 4.5** (`GEN_PROVIDER=anthropic`) — Gemini free tier surfaced `limit: 20`, too low for the run; the paid Anthropic key is reliable. Cross-theme samples: 8 themes represented, diverse interviewee names (contact-seeded), theme-appropriate severity, all planted blocked-deals (Retool→usage, Airtable→multi-entity, Attio→salesforce, Slite→latam) landed. ~$0.02 / 17 samples.
4. [x] `npm run seed:generate` — ✅ **DONE. Confirmed in Postgres, not just log output** (a prior attempt's misleading exit-code capture taught to always verify with a real `SELECT count(*)` — see the provider saga below). **956 tickets / 63 transcripts / 14 deals (11 lost, 3 in_progress) actually persisted.** Total cost **$1.22** on Anthropic Claude Haiku 4.5 (topped-up key). PHASE A1 IS COMPLETE.
5. [x] Verify: spot-checked planted deals + random tickets + segment distribution — all correct (see below). Full mentions-level verification happens after Phase A2 extraction.

**Provider saga (2026-07-20 evening — for context on why `.env.local` has 4 LLM keys):** Anthropic's original key ran out of credit 76% through a run (zero rows — `generate-data.ts` persists everything in ONE transaction at the very end, so a crash means nothing lands, not a partial write). Tried xAI (Grok) — account hit its spending limit on the first call. Tried Groq — code-verified working, but its structured-output-capable models cap at 200K tokens/day, about half the ~395K estimated need. Evaluated Cerebras (1M tokens/day but only 5 req/min → ~3.5-4hr run) but didn't commit. **Resolved by topping up the Anthropic account with a new key** — re-ran the full generation, verified success against live Postgres (not just the log), $1.22 total. `scripts/seed/llm.ts` now supports `GEN_PROVIDER=anthropic|google|openai|xai|groq|cerebras` if ever needed again.

**Real spot-check results (verified against actual Postgres data, not samples):**
- Planted blocked-deal accounts landed correctly: Retool→`usage_based_billing` ($204,507 lost), Airtable→`multi_entity_invoicing` ($737,096 lost), Attio→`salesforce_sync` ($67,232 lost) — ARR-scaled amounts, matches `opportunity-truth.json` exactly.
- Random ticket sample reads realistically and on-theme (dunning/webhook tickets sampled, correct severity register).
- Ticket count by account segment: 643 SMB / 229 mid-market / 84 enterprise — exactly the volume-trap shape the demo needs (lots of SMB noise, less enterprise signal, ARR-weighting will need to see through this at the ranking stage).

### Phase A2 — Extraction pipeline ✅ DONE (live ClickHouse populated)
1. [x] `lib/extraction/schema.ts` + `prompts.ts` + `model.ts` + `extract.ts` — closed-taxonomy Zod schema, verbatim-offset location, provider-agnostic (`EXTRACT_PROVIDER`, Groq supported).
2. [x] **Quality gate PASSED** — 20/20 theme + offset accuracy on real samples.
3. [x] `lib/extraction/pipeline.ts` — ticket/transcript LLM path + deterministic deal-loss mentions; pg `Date` coercion fixed.
4. [x] `trigger/extract-mentions.ts` — upgraded to **Trigger.dev SDK v4.5.5** (`@trigger.dev/sdk`, not `/v3`). Queue concurrency + 1h TTL. Cloud retired v3.
5. [x] **Full extraction + backfill run.** Smoke-tested one ticket/transcript/deal_loss via live worker → ClickHouse. First pass incomplete (TTL/queue); backfill recovered to **~97% source coverage**. Verified live: **1,802 mentions** in ClickHouse (956 tickets / 63 transcripts / 11 lost deals in Postgres). Expected ~5k was an overestimate — real docs yield fewer mentions/source.
6. [x] Distribution spot-check: dunning highest raw count (~582); usage-based highest enterprise ARR + 6 deal losses; multi-entity low volume, high ARR, greenfield, 2 deal losses.

### Phase A3 — Query functions + agent ✅ DONE
1. Four query functions — **runtime-verified against live mentions**:
   - [x] `getCompetitivePosition` — greenfield multi-entity confirmed
   - [x] `getThemeEvidence` / `getImpactProjection` / `listOpportunitiesRanked` / `signal-summary` — verified via `scripts/verify-queries.ts`
2. [x] Aggregate shapes for FE transforms — verified
3. **SCORING FORMULA — REVIEWED ON LIVE DATA; USER DECISION APPLIED:**
   ```
   signal_strength = 0.35×norm(enterprise_arr_weighted) + 0.25×norm(deal_loss_count)
                    + 0.20×norm(avg_severity) + 0.15×norm(mention_count) + 0.05×norm(recency_weighted)
   ```
   Recommendation rules: `build_now` = signal≥70 AND lost-deal; **`build_next` = signal≥53** (was 55 — lowered 2026-07-21 so multi-entity at 53 gets build_next) AND (greenfield OR ≥3 enterprise); `watch` = signal≥35 AND rising recency; else `deprioritize`.
   **Live ranked table (180d window, verified):**
   | Rank | Theme | Signal | Reco |
   | ---: | --- | ---: | --- |
   | 1 | usage_based_billing | 89.6 | build_now |
   | 2 | multi_entity_invoicing | 53 | build_next (greenfield) |
   | 3 | webhook_reliability | 44 | watch |
   | 4 | dunning_customization | 33.4 | deprioritize (582 mentions — volume trap) |
   | 7 | latam_tax | 23 | deprioritize (not `watch` — signal <35; left untuned) |
4. [x] Competitor feature→theme map
5. [x] `createAgentStream()` + `lib/agent/prioritize-flow.ts` — hybrid scripted chapters; Trigger task `stream-meridian-answer` + in-process fallback
6. [x] `chat.agent()` (`meridian-chat` in `trigger/agent.ts`) — scripted path + LLM+tools follow-ups
7. [x] E2E: `scripts/e2e-live-stream.ts` — 85 events, 6 chapters, three wow moments (volume trap / hidden gem / evidence). Headline correct.

### Phase A4 — OLTP+OLAP sync + docs ✅ CODE DONE
1. [x] `trigger/sync-oltp-to-olap.ts` — task + hourly `schedules.task` propagates account ARR/segment Postgres→ClickHouse mutations
2. [ ] Optional live ingestion ticker — not started
3. [ ] Secondary tools — not started
4. [ ] Query optimization pass — not started (queries already sub-second on 1.8k rows)
5. [x] `docs/architecture.md` with Mermaid OLTP+OLAP diagram

### Phase A5 — Deploy + submit ⏳ PARTIAL
1. [x] `npx trigger.dev@4.5.5 deploy` — **SUCCEEDED** 2026-07-21 as version `20260721.4` (6 tasks). Includes the hybrid general `chat.agent()` path plus scripted main/deep-dive flows.
2. [x] `SUBMISSION.md` updated with real verified counts
3. [ ] Demo video — **user records** (open on live product, max 5 min)
4. [x] MIT `LICENSE`; `README.md` rewritten (was 2-line placeholder)
5. [x] Repo is **public** on GitHub (`sparshgarg/meridian`)
6. [ ] Hackathon submission form — user
7. [x] Flip `NEXT_PUBLIC_AGENT_MODE=live` on **Vercel** (Sparsh-owned project `meridian` → `https://meridian-blush-iota.vercel.app`) + Production env + `--prod` deploy verified 2026-07-21

**Process rule (ongoing):** Keep updating this CONTEXT.md after each verified milestone and commit it with related work — do not let it drift.

**Hosting ownership (important):**
- **Vercel Production is on Sparsh's account** (`sparshgarg98-2119s-projects/meridian`) — production URL: `https://meridian-blush-iota.vercel.app`. Linked to `https://github.com/sparshgarg/meridian`. Teammate URL `https://meridian-mu-beryl.vercel.app` is superseded.
- **Trigger.dev Cloud** is on Sparsh's account (`proj_itrmpnqxuhbpcqlwtorl`). Sparsh owns Trigger deploy + Trigger dashboard env.

---

## 6. KEY DECISIONS & CONSTRAINTS (do not violate)

- **ClickHouse must be primary DB, Postgres is OLTP** — both required for bonus prize. Do NOT collapse to one database.
- **Agent MUST use Trigger.dev `chat.agent()`** — required, disqualification otherwise. Both ClickHouse and Trigger.dev must be meaningfully used.
- **All code written during July 17-23** — no pre-existing code. Data-artifact JSON (design) was allowed pre-window; generator code was written in-window.
- **Gemini free tier: 15 RPM (Flash) / 30 RPM (Flash-Lite), 1,500 req/day** — lower generator concurrency, one full run/day.
- **Ownership:** this is now a sole-developer project; Sparsh is authorized to edit all repository areas. Old Person A/B boundaries in `CLAUDE.md` are historical and do not restrict current work.
- **Extraction quality gate is non-negotiable** — 20-sample manual check before full extraction.
- **themes.id is a TEXT slug** (e.g. 'usage_based_billing'), NOT a UUID — it's the join key across mentions/tools/seed. Everything else uses UUIDs.
- **Demo video opens with live product** — handbook requirement.

## 7. STYLE RULES (from CLAUDE.md)
TypeScript strict, no `any`, async/await, single quotes + semicolons, named exports (except Next.js page/layout/route), files <~200 lines, comments explain why not what.

## 8. JUDGING RUBRIC (for prioritization)
- Use of ClickHouse & Trigger.dev — 25%
- Problem Fit — 20%
- Technical Implementation — 20%
- Innovation — 20%
- Scalability & Impact — 10%
- Presentation — 5%
Plus bonus category: best OLTP+OLAP integration (€1000).

---

## 9. HOW TO VERIFY (manual test)

**Production (use this):** https://meridian-blush-iota.vercel.app  
(`NEXT_PUBLIC_AGENT_MODE=live` on Sparsh's Vercel). Repo: https://github.com/sparshgarg/meridian

**Optional local:** copy `.env.example` → `.env.local`, set `NEXT_PUBLIC_AGENT_MODE=live` + DB/Trigger/Anthropic keys, then `npm run dev`.

### Primary demo path
1. Open Production URL above (ignore teammate URL `meridian-mu-beryl` — superseded).
2. Type: **"what should we prioritize next quarter?"** (or click that suggestion).
3. **Must see initially:**
   - Exactly 2 concise visual modules: Q4 opportunity landscape + traceable impact.
   - Headline banner: **“You should prioritize usage-based billing.”**
   - Status ticker shows real tool/ClickHouse activity (row counts near **~1.8k mentions**, not mock "4,812").
   - Opportunity ranking: **usage-based billing #1 `build_now`**, **multi-entity #2 `build_next`** (hidden gem).
   - Buttons: Why usage? / Why not dunning? / Explore multi-entity / Competitor insight / See impact assumptions.
   - No volume trap, evidence cards, or competitor matrix until clicked.
4. **Deep dives (each must create a new answer/request):**
   - Why not dunning? → ClickHouse volume/value scatter.
   - Explore multi-entity → ClickHouse-backed evidence/provenance cards.
   - Competitor insight → ClickHouse signal cross-check + Postgres competitor reference.
   - See impact assumptions → fresh ClickHouse/Postgres projection with account-level breakdown.
   - LATAM may appear as **`deprioritize`** (signal 23) — expected; webhook is the live `watch`.
5. **Ignore (not bugs):** ~1,802 mentions vs old ~5k target; ~97% extraction coverage (a few sources may lack mentions after schema/TTL skips).
6. **On LIVE URL, these ARE bugs:** mock-era canned numbers (4,812 mentions / 120 accounts / 200 deals), deep-dive buttons that only reveal preloaded data or do not issue a request, empty canvas, stuck spinner, ranking that puts dunning #1 or multi-entity off the podium, error stream events.
7. **Demo video** records this same Production URL, ≤5 min, landing the wow moments through progressive-disclosure clicks.

## 10. WHAT'S LEFT (updated 2026-07-21 — Sparsh Vercel Production live)

Phases A1–A4 + live extraction + agent E2E + Trigger Cloud deploy + **Sparsh Vercel Production** are **done**. Remaining = demo video + form.

### Done vs left
| Item | Status |
| --- | --- |
| Data pipeline + extraction (1,802 mentions) | ✅ Done |
| Scoring + hybrid agent + E2E | ✅ Done |
| Trigger Cloud deploy `20260721.4` | ✅ Done |
| Vercel Production (Sparsh) live mode | ✅ Done |
| Public GitHub `sparshgarg/meridian` | ✅ Done |
| **Demo video** (≤5 min on live URL) | ❌ User records |
| **Hackathon submission form** | ❌ User (deadline midnight AoE Jul 23) |

### Must do before submit
1. [x] **Trigger Cloud deploy** — version `20260721.4` live; hybrid data chat + progressive-disclosure stream verify OK
2. [x] **Vercel Production on Sparsh's account** — project `meridian`, URL `https://meridian-blush-iota.vercel.app`, `NEXT_PUBLIC_AGENT_MODE=live` + DB/Trigger/Anthropic env set; homepage + live chat smoke OK. Teammate URL superseded.
3. [ ] **Record demo video** — open on live product (`https://meridian-blush-iota.vercel.app`), ≤5 min, land three wow moments
4. [ ] **Hackathon submission form** — morning July 23 preferred (deadline midnight AoE July 23)

### Optional / nice-to-have (not blocking demo narrative)
- LATAM `watch` threshold — currently signal 23 → `deprioritize` (needs ≥35); only tune if you want narrative item #4 as `watch`
- Optional live ingestion ticker, secondary agent tools, query optimization pass (A4 leftovers; queries already sub-second)
- Stress-test chart components against fuller live shapes; demo shot list

Repo is already **public**. Do not change scoring code unless user asks.

## 11. OWNERSHIP & STATUS (updated 2026-07-21)

- **Sparsh is sole developer/owner:** repo, Trigger, Vercel, data, frontend, backend, demo video, and hackathon form.
- Former teammate Vercel URL `https://meridian-mu-beryl.vercel.app` is **superseded** — do not use for demo/submit.

**Keep CONTEXT.md updated after every verified milestone** (process rule going forward).

### Verified facts
- **GitHub:** https://github.com/sparshgarg/meridian (public)
- **Vercel Production (Sparsh):** `sparshgarg98-2119s-projects/meridian` → `https://meridian-blush-iota.vercel.app` (`NEXT_PUBLIC_AGENT_MODE=live`, smoke OK 2026-07-21)
- Postgres: 123 accounts / 956 tickets / 63 transcripts / 14 deals (11 lost) — re-counted live
- ClickHouse: **1,802 mentions** (dunning 582) — re-counted live; ~97% source coverage after backfill (a few leftover sources without mentions are expected)
- Trigger.dev: **v4.5.5**; Cloud deploy **`20260721.4`** ✅; includes hybrid `chat.agent()` data chat, safe typed tools, and scripted main/deep-dive flows
- Scoring: **`build_next ≥53`** (commit `fd71349`) — usage #1 build_now / multi #2 build_next / dunning deprioritize / LATAM deprioritize
- Agent E2E passed (`scripts/e2e-live-stream.ts`); Trigger path preferred, in-process fallback remains
- A4 sync + architecture docs on main; A5 LICENSE/README/SUBMISSION on main

### Recent commits on main
- `8708c62` — Progressive-disclosure recommendations with typed deep-dive requests
- `64094b6` — Document Sparsh Vercel Production URL after live deploy
- `3bf4a50` — Point CONTEXT.md at sparshgarg/meridian GitHub repo
- `ce38fd1` — Note successful Trigger Cloud deploy
- `fd71349` — build_next ≥53 + agent stream
- `9550c7d` — sync, architecture, LICENSE, SUBMISSION, E2E script

