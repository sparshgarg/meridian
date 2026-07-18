import type {
  GetCompetitivePositionOutput,
  GetImpactProjectionOutput,
  GetThemeEvidenceOutput,
} from '@/types/agent-tools';

export const USAGE_BASED_EVIDENCE: GetThemeEvidenceOutput = {
  theme_id: 'usage_based_billing',
  theme_name: 'Usage-based billing enhancements',
  evidence: [
    {
      source_type: 'deal_loss',
      source_id: 'DEAL-0187',
      account_name: 'Northwind Cloud',
      account_arr: 0,
      account_segment: 'enterprise',
      verbatim_snippet:
        'Ultimately went with Metronome — we meter API calls per customer and Meridian couldn\'t rate usage events natively.',
      event_date: '2026-06-11',
      severity: 5,
    },
    {
      source_type: 'transcript',
      source_id: 'INT-2026-031 @ 22:14',
      account_name: 'Datavolt Systems',
      account_arr: 640_000,
      account_segment: 'enterprise',
      verbatim_snippet:
        'We\'re literally exporting events to a spreadsheet and hand-building invoices every month. It\'s our biggest billing pain, full stop.',
      event_date: '2026-05-28',
      severity: 5,
    },
    {
      source_type: 'ticket',
      source_id: 'TCK-4821',
      account_name: 'Skyline Robotics',
      account_arr: 480_000,
      account_segment: 'enterprise',
      verbatim_snippet:
        'Is there any roadmap for metered billing tiers? Renewal conversation in Q4 depends on this.',
      event_date: '2026-06-30',
      severity: 4,
    },
    {
      source_type: 'transcript',
      source_id: 'INT-2026-044 @ 08:52',
      account_name: 'Ferrostack',
      account_arr: 410_000,
      account_segment: 'enterprise',
      verbatim_snippet:
        'Orb gives us real-time usage previews for customers. Your team said "next year" — that answer is getting harder to defend internally.',
      event_date: '2026-06-19',
      severity: 4,
    },
    {
      source_type: 'ticket',
      source_id: 'TCK-5107',
      account_name: 'Brightline Analytics',
      account_arr: 220_000,
      account_segment: 'mid_market',
      verbatim_snippet:
        'Second time asking: we need proration on usage overages. Currently double-billing customers and issuing credits manually.',
      event_date: '2026-07-08',
      severity: 4,
    },
  ],
  requesting_accounts: [
    { account_id: 'acc_datavolt', account_name: 'Datavolt Systems', arr: 640_000, segment: 'enterprise', n_mentions: 14 },
    { account_id: 'acc_skyline', account_name: 'Skyline Robotics', arr: 480_000, segment: 'enterprise', n_mentions: 11 },
    { account_id: 'acc_ferrostack', account_name: 'Ferrostack', arr: 410_000, segment: 'enterprise', n_mentions: 9 },
    { account_id: 'acc_brightline', account_name: 'Brightline Analytics', arr: 220_000, segment: 'mid_market', n_mentions: 8 },
    { account_id: 'acc_helioform', account_name: 'Helioform', arr: 380_000, segment: 'enterprise', n_mentions: 7 },
  ],
};

export const MULTI_ENTITY_EVIDENCE: GetThemeEvidenceOutput = {
  theme_id: 'multi_entity_invoicing',
  theme_name: 'Multi-entity consolidated invoicing',
  evidence: [
    {
      source_type: 'transcript',
      source_id: 'INT-2026-019 @ 41:07',
      account_name: 'Atlas Freight Group',
      account_arr: 720_000,
      account_segment: 'enterprise',
      verbatim_snippet:
        'We run 11 legal entities across Europe. Consolidated invoicing isn\'t a nice-to-have — our AP team blocks any vendor that can\'t do it.',
      event_date: '2026-04-22',
      severity: 5,
    },
    {
      source_type: 'deal_loss',
      source_id: 'DEAL-0142',
      account_name: 'Meridian West Holdings',
      account_arr: 0,
      account_segment: 'enterprise',
      verbatim_snippet:
        'Loss reason: procurement required a single consolidated invoice across 6 subsidiaries; we could only bill per-entity.',
      event_date: '2026-03-30',
      severity: 5,
    },
    {
      source_type: 'transcript',
      source_id: 'INT-2026-052 @ 15:33',
      account_name: 'Corvid Health',
      account_arr: 560_000,
      account_segment: 'enterprise',
      verbatim_snippet:
        'Every quarter-close our finance team reconciles 9 invoices by hand. If you fixed that we\'d expand to the other two business units.',
      event_date: '2026-07-02',
      severity: 4,
    },
    {
      source_type: 'ticket',
      source_id: 'TCK-3966',
      account_name: 'Atlas Freight Group',
      account_arr: 720_000,
      account_segment: 'enterprise',
      verbatim_snippet:
        'Requesting parent-child account rollup on invoices. Happy to join a design partner program if one exists.',
      event_date: '2026-05-15',
      severity: 3,
    },
  ],
  requesting_accounts: [
    { account_id: 'acc_atlas', account_name: 'Atlas Freight Group', arr: 720_000, segment: 'enterprise', n_mentions: 6 },
    { account_id: 'acc_corvid', account_name: 'Corvid Health', arr: 560_000, segment: 'enterprise', n_mentions: 5 },
    { account_id: 'acc_lumen', account_name: 'Lumenware', arr: 490_000, segment: 'enterprise', n_mentions: 4 },
    { account_id: 'acc_pallas', account_name: 'Pallas Logistics', arr: 430_000, segment: 'enterprise', n_mentions: 3 },
  ],
};

export const DUNNING_EVIDENCE: GetThemeEvidenceOutput = {
  theme_id: 'dunning_email_customization',
  theme_name: 'Dunning email customization',
  evidence: [
    {
      source_type: 'ticket',
      source_id: 'TCK-5201',
      account_name: 'Cactusworks',
      account_arr: 14_000,
      account_segment: 'smb',
      verbatim_snippet: 'Would love to change the color of the payment reminder emails to match our brand!',
      event_date: '2026-07-10',
      severity: 1,
    },
    {
      source_type: 'ticket',
      source_id: 'TCK-4987',
      account_name: 'Peak & Pine Outfitters',
      account_arr: 9_500,
      account_segment: 'smb',
      verbatim_snippet: 'Can we edit the dunning email copy? The default tone is a bit harsh for our customers.',
      event_date: '2026-06-24',
      severity: 2,
    },
    {
      source_type: 'ticket',
      source_id: 'TCK-4712',
      account_name: 'Bloom Stationery',
      account_arr: 6_800,
      account_segment: 'smb',
      verbatim_snippet: 'It would be nice to add our logo to the failed-payment notification.',
      event_date: '2026-06-02',
      severity: 1,
    },
  ],
  requesting_accounts: [
    { account_id: 'acc_cactus', account_name: 'Cactusworks', arr: 14_000, segment: 'smb', n_mentions: 4 },
    { account_id: 'acc_peakpine', account_name: 'Peak & Pine Outfitters', arr: 9_500, segment: 'smb', n_mentions: 3 },
    { account_id: 'acc_bloom', account_name: 'Bloom Stationery', arr: 6_800, segment: 'smb', n_mentions: 3 },
  ],
};

export const COMPETITOR_MATRIX: GetCompetitivePositionOutput = {
  competitors: ['Stripe', 'Adyen', 'Braintree', 'Metronome', 'Orb', 'Chargebee', 'Zuora'],
  features: [
    { feature_name: 'Usage-based rating engine', competitors_with_feature: ['Stripe', 'Metronome', 'Orb'], meridian_has_feature: false, meridian_gap_notes: 'Top gap — cited in 3 lost deals' },
    { feature_name: 'Real-time usage previews', competitors_with_feature: ['Metronome', 'Orb'], meridian_has_feature: false, meridian_gap_notes: 'Asked by 4 enterprise accounts' },
    { feature_name: 'Prepaid credits & burndown', competitors_with_feature: ['Stripe', 'Metronome', 'Orb', 'Zuora'], meridian_has_feature: false },
    { feature_name: 'Multi-entity consolidated invoicing', competitors_with_feature: [], meridian_has_feature: false, meridian_gap_notes: 'Greenfield — nobody has it' },
    { feature_name: 'Subscription lifecycle management', competitors_with_feature: ['Stripe', 'Braintree', 'Chargebee', 'Zuora'], meridian_has_feature: true },
    { feature_name: 'Revenue recognition (ASC 606)', competitors_with_feature: ['Stripe', 'Zuora'], meridian_has_feature: true },
    { feature_name: 'Global tax calculation', competitors_with_feature: ['Stripe', 'Adyen'], meridian_has_feature: true, meridian_gap_notes: 'LATAM coverage partial' },
    { feature_name: 'Dunning & smart retries', competitors_with_feature: ['Stripe', 'Braintree', 'Chargebee', 'Zuora'], meridian_has_feature: true },
    { feature_name: 'Custom dunning email branding', competitors_with_feature: ['Chargebee'], meridian_has_feature: false, meridian_gap_notes: 'SMB cosmetic ask' },
    { feature_name: 'Invoice PDF customization', competitors_with_feature: ['Chargebee', 'Zuora'], meridian_has_feature: true },
  ],
};

export const USAGE_BASED_IMPACT: GetImpactProjectionOutput = {
  theme_id: 'usage_based_billing',
  arr_at_risk: 1_410_000,
  pipeline_unblocked: 980_000,
  expansion_potential: 410_000,
  total: 2_800_000,
  confidence: 'high',
  breakdown: [
    { account_id: 'acc_datavolt', account_name: 'Datavolt Systems', contribution_type: 'risk', contribution_usd: 640_000, reason: 'Renewal in Nov; usage billing named a renewal condition in INT-2026-031' },
    { account_id: 'acc_skyline', account_name: 'Skyline Robotics', contribution_type: 'risk', contribution_usd: 480_000, reason: 'Q4 renewal "depends on" metered tiers (TCK-4821)' },
    { account_id: 'acc_helioform', account_name: 'Helioform', contribution_type: 'risk', contribution_usd: 290_000, reason: 'Evaluating Orb; health score dropped 18 pts since April' },
    { account_id: 'deal_northwind', account_name: 'Northwind Cloud', contribution_type: 'unblock', contribution_usd: 540_000, reason: 'Lost to Metronome (DEAL-0187); re-engage window in Q1' },
    { account_id: 'deal_quanta', account_name: 'Quanta Grid', contribution_type: 'unblock', contribution_usd: 440_000, reason: 'Stalled in negotiation pending usage-rating commitment' },
    { account_id: 'acc_brightline', account_name: 'Brightline Analytics', contribution_type: 'expansion', contribution_usd: 410_000, reason: 'Would move 2 more product lines onto Meridian with overage support' },
  ],
};
