import type {
  GetCompetitivePositionOutput,
  GetImpactProjectionOutput,
  GetThemeEvidenceOutput,
  ListOpportunitiesOutput,
} from './agent-tools';
import type { ThemeId } from './theme';

// ─────────────────────────────────────────────────────────────────────────────
// THE FRONTEND ↔ AGENT CONTRACT
// The agent streams NDJSON lines over HTTP; every line is one `StreamEvent`.
// The frontend renders an assistant answer as an ordered list of "chapters":
// short text intro + one visual + optional callouts. Person A's agent emits
// these events; Person B's canvas renders them. Change only via PR to /types.
// ─────────────────────────────────────────────────────────────────────────────

export type ChapterIcon =
  | 'radar'
  | 'ranking'
  | 'trap'
  | 'gem'
  | 'swords'
  | 'impact'
  | 'evidence'
  | 'trend'
  | 'summary';

export interface Callout {
  tone: 'insight' | 'warning' | 'evidence' | 'recommendation';
  title: string;
  body: string;
  // deep-link into a theme's evidence (renders a "view sources" affordance)
  theme_id?: ThemeId;
}

export interface StatTile {
  label: string;
  value: string; // pre-formatted by the agent, e.g. "$4.2M" / "312"
  sub?: string; // small caption under the value
  delta?: { value: string; direction: 'up' | 'down' | 'flat'; good: boolean };
}

export interface VolumeTrapPoint {
  theme_id: ThemeId;
  theme_name: string;
  mention_count: number;
  weighted_arr: number; // ARR-weighted demand (sum of requesting accounts' ARR)
  n_enterprise_accounts: number;
  // emphasis drives the scatter styling: trap = loud-but-low-value,
  // gem = quiet-but-high-value, null = context gray
  emphasis: 'trap' | 'gem' | null;
}

export interface TrendSeries {
  theme_id: ThemeId;
  theme_name: string;
  emphasized: boolean; // true = accent color, false = context gray
  points: { date: string; mentions: number }[]; // ISO week-start dates
}

// Discriminated union — one visual per chapter. `data` shapes reuse the tool
// output types in agent-tools.ts so the agent can pass tool results through.
export type ChapterVisual =
  | { type: 'stat_row'; data: { stats: StatTile[] } }
  | { type: 'opportunity_ranking'; data: ListOpportunitiesOutput }
  | { type: 'volume_trap'; data: { points: VolumeTrapPoint[] } }
  | { type: 'evidence_cards'; data: GetThemeEvidenceOutput }
  | { type: 'competitor_matrix'; data: GetCompetitivePositionOutput }
  | { type: 'impact_waterfall'; data: GetImpactProjectionOutput }
  | { type: 'trend_lines'; data: { series: TrendSeries[] } };

export type VisualType = ChapterVisual['type'];

export interface Chapter {
  id: string;
  title: string;
  icon: ChapterIcon;
  intro: string; // 1–3 sentences, streamed via chapter_intro_delta
  visual?: ChapterVisual;
  callouts: Callout[];
}

// ── Stream protocol (NDJSON: one JSON-encoded StreamEvent per line) ──────────

export interface StatusUpdate {
  id: string;
  label: string; // e.g. "Querying ClickHouse: mentions, last 90 days"
  detail?: string; // e.g. "4,812 rows scanned in 38ms"
  state: 'running' | 'done';
}

export type StreamEvent =
  | { type: 'message_start'; message_id: string }
  | { type: 'status'; status: StatusUpdate }
  | { type: 'chapter_start'; chapter_id: string; title: string; icon: ChapterIcon }
  | { type: 'chapter_intro_delta'; chapter_id: string; delta: string }
  | { type: 'chapter_visual'; chapter_id: string; visual: ChapterVisual }
  | { type: 'chapter_callout'; chapter_id: string; callout: Callout }
  | { type: 'message_end'; message_id: string; headline: string }
  | { type: 'error'; message: string };

// Request body for POST /api/chat
export interface ChatRequest {
  conversation_id: string;
  messages: { role: 'user' | 'assistant'; content: string }[];
}
