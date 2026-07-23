import type {
  Callout,
  ChapterIcon,
  ChapterVisual,
  ChatRequest,
  VisualAction,
} from '@/types/chapter';
import {
  COMPETITOR_MATRIX,
  MULTI_ENTITY_EVIDENCE,
  USAGE_BASED_EVIDENCE,
  USAGE_BASED_IMPACT,
} from './evidence';
import { OPPORTUNITIES_OUTPUT, VOLUME_TRAP_POINTS } from './opportunities';

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
  intro?: string;
  visual: ChapterVisual;
  callouts?: Callout[];
  actions?: VisualAction[];
}

export type ScriptStep = ScriptStatus | ScriptChapter;

export interface Scenario {
  headline: string;
  steps: ScriptStep[];
  suggested_followups?: string[];
}

const status = (label: string, detail: string): ScriptStatus => ({
  kind: 'status',
  label,
  detail,
  duration_ms: 250,
});

const actions: VisualAction[] = [
  { id: 'why_usage', label: 'Why usage?', aria_label: 'Query usage-based billing evidence', theme_id: 'usage_based_billing' },
  { id: 'why_not_dunning', label: 'Why not dunning?', aria_label: 'Query why dunning is deprioritized', theme_id: 'dunning_customization' },
  { id: 'explore_multi_entity', label: 'Explore multi-entity', aria_label: 'Query multi-entity evidence', theme_id: 'multi_entity_invoicing' },
  { id: 'competitor_insight', label: 'Competitor insight', aria_label: 'Query competitive positioning', theme_id: 'usage_based_billing' },
];

const prioritize: Scenario = {
  headline: 'You should prioritize usage-based billing.',
  suggested_followups: [
    'Why shouldn’t we prioritize dunning email customization?',
    'Tell me more about multi-entity consolidated invoicing',
    'Where are competitors beating us on usage-based billing?',
    'What does Figma want?',
    'Which themes are growing fastest over the last 90 days?',
  ],
  steps: [
    status('Querying ClickHouse: rank opportunities', '1,802 mentions · 41ms'),
    {
      kind: 'chapter',
      title: 'Q4 opportunity landscape',
      icon: 'ranking',
      visual: { type: 'opportunity_ranking', data: OPPORTUNITIES_OUTPUT },
      actions,
    },
    status('Querying ClickHouse: usage-based impact', '6 account inputs · 35ms'),
    {
      kind: 'chapter',
      title: 'Traceable impact',
      icon: 'impact',
      visual: { type: 'impact_waterfall', data: USAGE_BASED_IMPACT },
      actions: [{
        id: 'impact_details',
        label: 'See impact assumptions',
        aria_label: 'Query account-level impact assumptions',
        theme_id: 'usage_based_billing',
      }],
    },
  ],
};

const dunning: Scenario = {
  headline: 'Dunning is loud but low-value: deprioritize it.',
  steps: [
    status('Querying ClickHouse: dunning volume versus value', '1,802 mentions compared · 38ms'),
    {
      kind: 'chapter',
      title: 'Why not dunning',
      icon: 'trap',
      visual: { type: 'volume_trap', data: { points: VOLUME_TRAP_POINTS } },
    },
  ],
};

const usage: Scenario = {
  headline: 'Usage-based wins on enterprise demand and blocked deals.',
  steps: [
    status('Querying ClickHouse: usage-based evidence', '8 sources · 1,802 mentions · 44ms'),
    {
      kind: 'chapter',
      title: 'Why usage-based wins',
      icon: 'evidence',
      visual: { type: 'evidence_cards', data: USAGE_BASED_EVIDENCE },
      actions: [{
        id: 'impact_details',
        label: 'See impact assumptions',
        aria_label: 'Query usage-based impact assumptions',
        theme_id: 'usage_based_billing',
      }],
    },
  ],
};

const multiEntity: Scenario = {
  headline: 'Multi-entity is quiet, enterprise-heavy, and greenfield.',
  steps: [
    status('Querying ClickHouse: multi-entity evidence', '8 sources · 9 accounts · 39ms'),
    {
      kind: 'chapter',
      title: 'Multi-entity, unpacked',
      icon: 'gem',
      visual: { type: 'evidence_cards', data: MULTI_ENTITY_EVIDENCE },
    },
  ],
};

const competitive: Scenario = {
  headline: 'Usage-based is the exposed gap; multi-entity remains greenfield.',
  steps: [
    status('Cross-checking ClickHouse signal with competitor data', '1,802 mentions + 7 competitors · 48ms'),
    {
      kind: 'chapter',
      title: 'Competitive insight',
      icon: 'swords',
      visual: { type: 'competitor_matrix', data: COMPETITOR_MATRIX },
    },
  ],
};

const impact: Scenario = {
  headline: '$2.8M traceable impact across 6 account-level inputs.',
  steps: [
    status('Querying ClickHouse: impact assumptions', '6 account-level inputs · 36ms'),
    {
      kind: 'chapter',
      title: 'Impact assumptions',
      icon: 'impact',
      visual: { type: 'impact_breakdown', data: USAGE_BASED_IMPACT },
    },
  ],
};

export const pickScenario = (body: ChatRequest): Scenario => {
  if (body.action?.id === 'why_usage') return usage;
  if (body.action?.id === 'why_not_dunning') return dunning;
  if (body.action?.id === 'explore_multi_entity') return multiEntity;
  if (body.action?.id === 'competitor_insight') return competitive;
  if (body.action?.id === 'impact_details') return impact;

  const prompt = [...body.messages].reverse().find((message) => message.role === 'user')?.content.toLowerCase() ?? '';
  if (/(dunning|email|loud|volume|most requested)/.test(prompt)) return dunning;
  if (/(compet|stripe|adyen|metronome|orb|market|gap)/.test(prompt)) return competitive;
  if (/(multi.entity|consolidated invoic|hidden gem)/.test(prompt)) return multiEntity;
  if (/(impact assumption|impact detail|calculation)/.test(prompt)) return impact;
  if (/(usage|evidence|proof|source|why)/.test(prompt)) return usage;
  return prioritize;
};
