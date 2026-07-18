import type { Callout, ChapterIcon, ChapterVisual } from '@/types/chapter';
import {
  COMPETITOR_MATRIX,
  DUNNING_EVIDENCE,
  MULTI_ENTITY_EVIDENCE,
  USAGE_BASED_EVIDENCE,
  USAGE_BASED_IMPACT,
} from './evidence';
import { OPPORTUNITIES_OUTPUT, TREND_SERIES, VOLUME_TRAP_POINTS } from './opportunities';

export interface ScriptStatus {
  kind: 'status';
  label: string;
  detail: string;
  duration_ms: number;
}

export interface ScriptChapter {
  kind: 'chapter';
  title: string;
  icon: ChapterIcon;
  intro: string;
  visual?: ChapterVisual;
  callouts?: Callout[];
}

export type ScriptStep = ScriptStatus | ScriptChapter;

export interface Scenario {
  headline: string;
  steps: ScriptStep[];
}

const status = (label: string, detail: string, duration_ms = 700): ScriptStatus => ({
  kind: 'status', label, detail, duration_ms,
});

const STAT_ROW: ChapterVisual = {
  type: 'stat_row',
  data: {
    stats: [
      { label: 'Mentions analyzed', value: '4,812', sub: 'last 180 days', delta: { value: '+22%', direction: 'up', good: true } },
      { label: 'Sources read', value: '1,155', sub: '900 tickets · 55 interviews · 200 deals' },
      { label: 'Distinct themes', value: '8', sub: 'after dedup & clustering' },
      { label: 'ARR represented', value: '$9.6M', sub: 'of $15M total book', delta: { value: '64%', direction: 'flat', good: true } },
    ],
  },
};

const PRIORITIZE: Scenario = {
  headline: 'Q4 priorities: usage-based billing #1, multi-entity invoicing the hidden gem — and don\'t fall for the dunning volume trap.',
  steps: [
    status('Querying ClickHouse: mentions, last 180 days', '4,812 rows · 41ms'),
    status('Joining Postgres: accounts, deals, themes taxonomy', '120 accounts · 200 deals'),
    {
      kind: 'chapter',
      title: 'The signal landscape',
      icon: 'radar',
      intro:
        'I read every support ticket, interview transcript, and deal record from the last six months. Here\'s the shape of what your customers have been telling us.',
      visual: STAT_ROW,
    },
    status('Ranking themes: ARR-weighted composite score', '8 themes scored'),
    {
      kind: 'chapter',
      title: 'What actually matters, ranked',
      icon: 'ranking',
      intro:
        'Ranked by signal strength — a composite of ARR-weighted demand, severity, competitive pressure, and deal impact. Not by how loud each theme is.',
      visual: { type: 'opportunity_ranking', data: OPPORTUNITIES_OUTPUT },
      callouts: [
        {
          tone: 'recommendation',
          title: 'Build now: usage-based billing',
          body: '$4.6M of requester ARR, 8 enterprise accounts, 3 lost deals, and Stripe, Metronome and Orb all ahead. This is your Q4 anchor.',
          theme_id: 'usage_based_billing',
        },
      ],
    },
    status('Cross-checking: raw volume vs ARR-weighted demand', 'divergence detected on 1 theme'),
    {
      kind: 'chapter',
      title: 'The volume trap',
      icon: 'trap',
      intro:
        'Dunning email customization is the single loudest theme in the dataset — 198 mentions. But volume is a lie: plot loudness against the ARR behind it and the story flips.',
      visual: { type: 'volume_trap', data: { points: VOLUME_TRAP_POINTS } },
      callouts: [
        {
          tone: 'warning',
          title: 'Loud ≠ important',
          body: '60 of 61 accounts asking for dunning customization are SMB, zero deals are blocked, and the asks are cosmetic. A mention-count roadmap would have put this at #1.',
          theme_id: 'dunning_email_customization',
        },
      ],
    },
    status('Scanning for low-volume / high-ARR outliers', '1 hidden gem found'),
    {
      kind: 'chapter',
      title: 'The hidden gem',
      icon: 'gem',
      intro:
        'Multi-entity consolidated invoicing barely registers on volume — 31 mentions from just 9 accounts. But 6 of those 9 are top-15 enterprise, one deal already died over it, and no competitor has it.',
      visual: { type: 'evidence_cards', data: MULTI_ENTITY_EVIDENCE },
      callouts: [
        {
          tone: 'insight',
          title: 'Greenfield, and expansion-loaded',
          body: 'Corvid Health explicitly ties an expansion to this. A quiet theme with $2.9M of enterprise ARR behind it is a gem, not noise.',
          theme_id: 'multi_entity_invoicing',
        },
      ],
    },
    status('Loading competitor matrix', '7 competitors × 20 features'),
    {
      kind: 'chapter',
      title: 'Where competitors are winning',
      icon: 'swords',
      intro:
        'The usage-based gap is where we\'re most exposed — three competitors ahead, two of them usage-native. Multi-entity invoicing is the inverse: nobody has it.',
      visual: { type: 'competitor_matrix', data: COMPETITOR_MATRIX },
    },
    status('Projecting impact: usage-based billing', 'risk + pipeline + expansion'),
    {
      kind: 'chapter',
      title: 'What usage-based billing is worth',
      icon: 'impact',
      intro:
        'Summing renewal risk, stalled pipeline, and named expansions tied to this single theme — every dollar traceable to a specific account or deal.',
      visual: { type: 'impact_waterfall', data: USAGE_BASED_IMPACT },
      callouts: [
        {
          tone: 'recommendation',
          title: 'The Q4 plan',
          body: '1) Ship usage-based rating (build now). 2) Scope multi-entity invoicing with Atlas Freight as design partner (build next). 3) Put LATAM tax on the Q1 watchlist. 4) Politely park dunning emails.',
        },
      ],
    },
  ],
};

const DUNNING: Scenario = {
  headline: 'Dunning customization is your loudest theme — and still the wrong thing to build.',
  steps: [
    status('Querying ClickHouse: mentions for dunning_email_customization', '198 mentions · 61 accounts'),
    {
      kind: 'chapter',
      title: 'Loudest theme in the dataset',
      icon: 'trap',
      intro:
        'Dunning email customization tops raw volume with 198 mentions — nearly double the #2 theme. Here\'s that volume plotted against the ARR actually behind each theme.',
      visual: { type: 'volume_trap', data: { points: VOLUME_TRAP_POINTS } },
    },
    status('Sampling verbatim evidence', 'severity histogram: mostly 1–2'),
    {
      kind: 'chapter',
      title: 'Read the actual asks',
      icon: 'evidence',
      intro:
        'The quotes tell you everything: logo placement, email tone, brand colors. Severity 1–2 cosmetic requests, almost entirely from SMB accounts.',
      visual: { type: 'evidence_cards', data: DUNNING_EVIDENCE },
      callouts: [
        {
          tone: 'warning',
          title: 'Deprioritize — with a cheap consolation',
          body: 'No enterprise account is blocked and no deal cites it. If you want goodwill, a logo-upload option is a 1-sprint gesture; the full template editor is not a Q4 project.',
          theme_id: 'dunning_email_customization',
        },
      ],
    },
  ],
};

const COMPETITIVE: Scenario = {
  headline: 'We\'re behind on usage-based billing, ahead on nothing loud — and multi-entity invoicing is open field.',
  steps: [
    status('Loading competitor matrix', '7 competitors × 20 features'),
    {
      kind: 'chapter',
      title: 'The competitive board',
      icon: 'swords',
      intro:
        'Feature-by-feature against the seven competitors that show up in our deals. The usage-based cluster is where losses concentrate.',
      visual: { type: 'competitor_matrix', data: COMPETITOR_MATRIX },
    },
    status('Correlating gaps with deal losses', '3 losses cite usage-based'),
    {
      kind: 'chapter',
      title: 'Momentum check',
      icon: 'trend',
      intro:
        'Usage-based mentions have tripled since February, and LATAM tax is quietly accelerating. The flat lines are the themes you can safely ignore this quarter.',
      visual: { type: 'trend_lines', data: { series: TREND_SERIES } },
      callouts: [
        {
          tone: 'insight',
          title: 'Timing matters',
          body: 'Metronome and Orb are setting enterprise expectations for real-time usage previews. Each quarter of delay raises the bar we\'ll eventually have to clear.',
          theme_id: 'usage_based_billing',
        },
      ],
    },
  ],
};

const USAGE_EVIDENCE: Scenario = {
  headline: 'Usage-based billing: $2.8M of traceable impact across 8 enterprise accounts and 3 lost deals.',
  steps: [
    status('Querying ClickHouse: evidence for usage_based_billing', '155 mentions · 34 accounts'),
    {
      kind: 'chapter',
      title: 'The evidence file',
      icon: 'evidence',
      intro:
        'Every claim traces to a source: ticket IDs, interview timestamps, deal records. These are the five highest-severity items.',
      visual: { type: 'evidence_cards', data: USAGE_BASED_EVIDENCE },
    },
    status('Projecting impact', 'confidence: high'),
    {
      kind: 'chapter',
      title: 'Dollarizing the theme',
      icon: 'impact',
      intro:
        'Renewal risk, stalled pipeline, and named expansion — stacked into a single defensible number for your planning doc.',
      visual: { type: 'impact_waterfall', data: USAGE_BASED_IMPACT },
      callouts: [
        {
          tone: 'evidence',
          title: 'No hallucinated numbers',
          body: 'All six line items link to a specific account, ticket, transcript timestamp, or deal record. Click any evidence card to see the verbatim source.',
          theme_id: 'usage_based_billing',
        },
      ],
    },
  ],
};

export const pickScenario = (prompt: string): Scenario => {
  const p = prompt.toLowerCase();
  if (/(dunning|email|loud|volume|most requested|top request)/.test(p)) return DUNNING;
  if (/(compet|stripe|adyen|metronome|orb|chargebee|zuora|braintree|market|gap)/.test(p)) return COMPETITIVE;
  if (/(usage|evidence|proof|source|impact|revenue|arr|why)/.test(p)) return USAGE_EVIDENCE;
  return PRIORITIZE;
};
