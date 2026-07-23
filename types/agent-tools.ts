import type { ThemeId, Theme } from './theme';
import type { Account } from './account';

// Tool: list_opportunities_ranked
export interface ListOpportunitiesInput {
  time_window_days?: number;       // default 90
  segment_filter?: 'enterprise' | 'mid_market' | 'smb' | 'all';
  category_filter?: Theme['category'] | 'all';
}

export interface OpportunityRow {
  theme_id: ThemeId;
  theme_name: string;
  signal_strength: number;         // weighted composite score, 0-100
  total_arr_of_requesters: number; // sum of ARR of all requesting accounts
  n_unique_accounts: number;
  n_enterprise_accounts: number;
  mention_counts: {                // for the stacked-bar viz
    tickets: number;
    transcripts: number;
    deal_losses: number;
  };
  competitive_status: 'behind' | 'parity' | 'ahead' | 'greenfield';
  competitors_ahead: string[];     // names of competitors with this feature
  estimated_impact_usd: number;    // ARR at risk + pipeline unblocked
  recommendation: 'build_now' | 'build_next' | 'watch' | 'deprioritize';
  reasoning: string;               // 1-sentence rationale
}

export interface ListOpportunitiesOutput {
  opportunities: OpportunityRow[];
  total_mentions_analyzed: number;
  time_window: { from: string; to: string };
}

// Tool: get_theme_evidence
export interface GetThemeEvidenceInput {
  theme_id: ThemeId;
  limit?: number;                  // default 20
}

export interface EvidenceItem {
  source_type: 'ticket' | 'transcript' | 'deal_loss';
  source_id: string;
  account_name: string;
  account_arr: number;
  account_segment: Account['segment'];
  verbatim_snippet: string;
  full_source_url?: string;
  event_date: string;
  severity: number;
}

export interface GetThemeEvidenceOutput {
  theme_id: ThemeId;
  theme_name: string;
  evidence: EvidenceItem[];
  requesting_accounts: {
    account_id: string;
    account_name: string;
    arr: number;
    segment: Account['segment'];
    n_mentions: number;
  }[];
}

// Tool: get_competitive_position
export interface GetCompetitivePositionInput {
  theme_id?: ThemeId;
}

export interface CompetitorFeature {
  feature_name: string;
  competitors_with_feature: string[];
  meridian_has_feature: boolean;
  meridian_gap_notes?: string;
}

export interface GetCompetitivePositionOutput {
  competitors: string[];
  features: CompetitorFeature[];
}

// Tool: get_impact_projection
export interface GetImpactProjectionInput {
  theme_id: ThemeId;
}

export interface GetImpactProjectionOutput {
  theme_id: ThemeId;
  arr_at_risk: number;
  pipeline_unblocked: number;
  expansion_potential: number;
  total: number;
  confidence: 'low' | 'medium' | 'high';
  breakdown: {
    account_id: string;
    account_name: string;
    contribution_type: 'risk' | 'unblock' | 'expansion';
    contribution_usd: number;
    reason: string;
  }[];
}

// Tools for safe entity-aware data chat. Account identity is resolved in
// Postgres; all signal aggregation and evidence comes from ClickHouse.
export interface AccountSearchResult {
  account_id: string;
  account_name: string;
  industry: string;
  arr: number;
  segment: Account['segment'];
}

export interface FindAccountsInput {
  query: string;
  limit?: number;
}

export interface FindAccountsOutput {
  matches: AccountSearchResult[];
  /** Present when the query looks like a portfolio/question, not a company name. */
  rejected_as_name_lookup?: boolean;
  hint?: string;
}

export type AccountSegmentFilter = 'enterprise' | 'mid_market' | 'smb' | 'all';

export interface ListTopAccountsInput {
  limit?: number; // default 5, max 15
  segment?: AccountSegmentFilter;
  themes_per_account?: number; // default 3
}

export interface TopAccountTheme {
  theme_id: ThemeId;
  theme_name: string;
  mention_count: number;
}

export interface TopAccountRow {
  rank: number;
  account_id: string;
  account_name: string;
  industry: string;
  arr: number;
  segment: Account['segment'];
  total_mentions: number;
  top_themes: TopAccountTheme[];
}

export interface ListTopAccountsOutput {
  accounts: TopAccountRow[];
  filters: {
    limit: number;
    segment: AccountSegmentFilter;
    themes_per_account: number;
  };
  provenance: {
    source: 'ClickHouse';
    tables: string[];
  };
}

export interface AccountThemeSignal {
  theme_id: ThemeId;
  theme_name: string;
  mention_count: number;
  avg_severity: number;
  latest_signal_date: string;
  source_counts: {
    tickets: number;
    transcripts: number;
    deal_losses: number;
  };
}

export interface GetAccountSignalsInput {
  account_id: string;
  evidence_limit?: number;
}

export interface GetAccountSignalsOutput {
  account: AccountSearchResult;
  themes: AccountThemeSignal[];
  evidence: EvidenceItem[];
  deals: {
    deal_id: string;
    name: string;
    status: 'won' | 'lost' | 'in_progress';
    amount: number;
    blocking_theme_id?: ThemeId;
    loss_reason?: string;
  }[];
  total_mentions: number;
}

export type SignalSegment = 'enterprise' | 'mid_market' | 'smb' | 'all';

export interface CompareSignalsInput {
  theme_ids?: ThemeId[];
  segment?: SignalSegment;
  industry?: string;
  time_window_days?: number;
}

export interface SignalComparisonRow {
  theme_id: ThemeId;
  theme_name: string;
  mention_count: number;
  unique_accounts: number;
  requester_arr: number;
  avg_severity: number;
  source_counts: {
    tickets: number;
    transcripts: number;
    deal_losses: number;
  };
}

export interface CompareSignalsOutput {
  rows: SignalComparisonRow[];
  filters: {
    theme_ids: ThemeId[];
    segment: SignalSegment;
    industry?: string;
    time_window_days: number;
  };
  total_mentions: number;
  matched_accounts: number;
  provenance: {
    source: 'ClickHouse';
    tables: string[];
  };
}
