import type { ListOpportunitiesOutput, OpportunityRow } from '@/types/agent-tools';
import type { VolumeTrapPoint, TrendSeries } from '@/types/chapter';

// Mock encodes the demo's "opportunity truth": usage-based #1, multi-entity
// hidden gem, dunning volume-trap, LATAM watch, rest backlog.
export const OPPORTUNITY_ROWS: OpportunityRow[] = [
  {
    theme_id: 'usage_based_billing',
    theme_name: 'Usage-based billing enhancements',
    signal_strength: 92,
    total_arr_of_requesters: 4_620_000,
    n_unique_accounts: 34,
    n_enterprise_accounts: 8,
    mention_counts: { tickets: 96, transcripts: 41, deal_losses: 18 },
    competitive_status: 'behind',
    competitors_ahead: ['Stripe', 'Metronome', 'Orb'],
    estimated_impact_usd: 2_800_000,
    recommendation: 'build_now',
    reasoning: '8 enterprise accounts blocked, 3 lost deals cite it, and every usage-native competitor is ahead.',
  },
  {
    theme_id: 'multi_entity_invoicing',
    theme_name: 'Multi-entity consolidated invoicing',
    signal_strength: 81,
    total_arr_of_requesters: 2_940_000,
    n_unique_accounts: 9,
    n_enterprise_accounts: 6,
    mention_counts: { tickets: 12, transcripts: 14, deal_losses: 5 },
    competitive_status: 'greenfield',
    competitors_ahead: [],
    estimated_impact_usd: 1_910_000,
    recommendation: 'build_next',
    reasoning: 'Tiny mention count but 6 of 9 requesters are top-15 enterprise — and no competitor has it.',
  },
  {
    theme_id: 'latam_tax',
    theme_name: 'LATAM tax handling',
    signal_strength: 54,
    total_arr_of_requesters: 1_310_000,
    n_unique_accounts: 17,
    n_enterprise_accounts: 3,
    mention_counts: { tickets: 28, transcripts: 11, deal_losses: 6 },
    competitive_status: 'behind',
    competitors_ahead: ['Stripe', 'Adyen'],
    estimated_impact_usd: 760_000,
    recommendation: 'watch',
    reasoning: 'Mentions up 3× quarter-over-quarter but no enterprise blocker yet — revisit for Q1.',
  },
  {
    theme_id: 'hybrid_revrec',
    theme_name: 'Hybrid revenue recognition',
    signal_strength: 41,
    total_arr_of_requesters: 880_000,
    n_unique_accounts: 11,
    n_enterprise_accounts: 2,
    mention_counts: { tickets: 22, transcripts: 9, deal_losses: 2 },
    competitive_status: 'parity',
    competitors_ahead: ['Zuora'],
    estimated_impact_usd: 410_000,
    recommendation: 'deprioritize',
    reasoning: 'Steady but shallow demand; Zuora-only gap with workarounds in place.',
  },
  {
    theme_id: 'dunning_email_customization',
    theme_name: 'Dunning email customization',
    signal_strength: 38,
    total_arr_of_requesters: 1_060_000,
    n_unique_accounts: 61,
    n_enterprise_accounts: 1,
    mention_counts: { tickets: 187, transcripts: 9, deal_losses: 2 },
    competitive_status: 'parity',
    competitors_ahead: ['Chargebee'],
    estimated_impact_usd: 340_000,
    recommendation: 'deprioritize',
    reasoning: 'Highest raw volume in the dataset, but 60 of 61 requesters are SMB and nothing is blocked.',
  },
  {
    theme_id: 'webhook_reliability',
    theme_name: 'Webhook delivery reliability',
    signal_strength: 36,
    total_arr_of_requesters: 720_000,
    n_unique_accounts: 19,
    n_enterprise_accounts: 1,
    mention_counts: { tickets: 41, transcripts: 4, deal_losses: 1 },
    competitive_status: 'parity',
    competitors_ahead: [],
    estimated_impact_usd: 190_000,
    recommendation: 'deprioritize',
    reasoning: 'Support-heavy but resolved by retries; no revenue attached.',
  },
  {
    theme_id: 'salesforce_sync',
    theme_name: 'Salesforce billing sync',
    signal_strength: 33,
    total_arr_of_requesters: 640_000,
    n_unique_accounts: 8,
    n_enterprise_accounts: 1,
    mention_counts: { tickets: 14, transcripts: 6, deal_losses: 2 },
    competitive_status: 'behind',
    competitors_ahead: ['Zuora', 'Chargebee'],
    estimated_impact_usd: 220_000,
    recommendation: 'deprioritize',
    reasoning: 'Mid-market convenience ask; existing CSV export is an accepted workaround.',
  },
  {
    theme_id: 'invoice_templates',
    theme_name: 'Invoice template designer',
    signal_strength: 29,
    total_arr_of_requesters: 410_000,
    n_unique_accounts: 24,
    n_enterprise_accounts: 0,
    mention_counts: { tickets: 33, transcripts: 3, deal_losses: 0 },
    competitive_status: 'parity',
    competitors_ahead: ['Chargebee'],
    estimated_impact_usd: 90_000,
    recommendation: 'deprioritize',
    reasoning: 'Cosmetic SMB ask with zero deal impact.',
  },
];

export const OPPORTUNITIES_OUTPUT: ListOpportunitiesOutput = {
  opportunities: OPPORTUNITY_ROWS,
  total_mentions_analyzed: 4_812,
  time_window: { from: '2026-01-15', to: '2026-07-15' },
};

export const VOLUME_TRAP_POINTS: VolumeTrapPoint[] = OPPORTUNITY_ROWS.map((r) => ({
  theme_id: r.theme_id,
  theme_name: r.theme_name,
  mention_count: r.mention_counts.tickets + r.mention_counts.transcripts + r.mention_counts.deal_losses,
  weighted_arr: r.total_arr_of_requesters,
  n_enterprise_accounts: r.n_enterprise_accounts,
  emphasis:
    r.theme_id === 'dunning_email_customization' ? 'trap'
    : r.theme_id === 'multi_entity_invoicing' ? 'gem'
    : null,
}));

const weekly = (base: number, growth: number, noise: number[]): number[] =>
  noise.map((n, i) => Math.max(0, Math.round(base + growth * i + n)));

const WEEKS = Array.from({ length: 24 }, (_, i) => {
  const d = new Date('2026-02-02');
  d.setDate(d.getDate() + i * 7);
  return d.toISOString().slice(0, 10);
});

const toSeries = (
  theme_id: string,
  theme_name: string,
  emphasized: boolean,
  values: number[],
): TrendSeries => ({
  theme_id,
  theme_name,
  emphasized,
  points: WEEKS.map((date, i) => ({ date, mentions: values[i] ?? 0 })),
});

export const TREND_SERIES: TrendSeries[] = [
  toSeries('usage_based_billing', 'Usage-based billing', true,
    weekly(3, 0.28, [0, 1, -1, 2, 0, 1, 2, -1, 1, 3, 0, 2, 1, 3, 2, 4, 1, 3, 5, 2, 4, 3, 5, 4])),
  toSeries('latam_tax', 'LATAM tax', true,
    weekly(0.2, 0.13, [0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 2, 1, 1, 2, 2, 1, 3, 2, 3, 3, 4, 3, 4])),
  toSeries('dunning_email_customization', 'Dunning emails', false,
    weekly(8, 0.02, [1, -2, 2, 0, -1, 2, 1, -2, 0, 2, -1, 1, 0, 2, -2, 1, 0, -1, 2, 0, 1, -1, 0, 1])),
  toSeries('hybrid_revrec', 'Hybrid RevRec', false,
    weekly(1.4, 0.01, [0, 1, 0, -1, 1, 0, 1, 0, -1, 1, 0, 0, 1, -1, 0, 1, 0, 1, -1, 0, 1, 0, 0, 1])),
];
