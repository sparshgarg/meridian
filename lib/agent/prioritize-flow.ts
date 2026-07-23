import type { ChatRequest, StreamEvent, VisualAction } from '@/types/chapter';
import { getImpactProjection } from '@/lib/queries/impact-projection';
import { listOpportunitiesRanked } from '@/lib/queries/opportunities-ranked';
import { runDeepDiveFlow } from './deep-dive-flow';
import { pickFlowKind, withCommas } from './stream-helpers';

const WINDOW = 180;

const rankingActions: VisualAction[] = [
  {
    id: 'why_usage',
    label: 'Why usage?',
    aria_label: 'Query evidence for usage-based billing',
    theme_id: 'usage_based_billing',
  },
  {
    id: 'why_not_dunning',
    label: 'Why not dunning?',
    aria_label: 'Query why dunning should not be prioritized',
    theme_id: 'dunning_customization',
  },
  {
    id: 'explore_multi_entity',
    label: 'Explore multi-entity',
    aria_label: 'Query the multi-entity invoicing opportunity',
    theme_id: 'multi_entity_invoicing',
  },
  {
    id: 'competitor_insight',
    label: 'Competitor insight',
    aria_label: 'Query competitive positioning for the leading opportunities',
    theme_id: 'usage_based_billing',
  },
];

const impactActions: VisualAction[] = [
  {
    id: 'impact_details',
    label: 'See impact assumptions',
    aria_label: 'Query account-level impact assumptions',
    theme_id: 'usage_based_billing',
  },
];

export async function* runAgentFlow(body: ChatRequest): AsyncGenerator<StreamEvent> {
  const lastUser = [...body.messages].reverse().find((message) => message.role === 'user');
  const kind = pickFlowKind(lastUser?.content ?? '', body.action?.id);
  const messageId = `msg_${Date.now().toString(36)}`;
  yield { type: 'message_start', message_id: messageId };

  try {
    if (kind === 'prioritize') {
      yield* runPrioritizeFlow(messageId);
    } else if (kind !== 'general') {
      yield* runDeepDiveFlow(kind, messageId);
    } else {
      throw new Error('General questions must be routed through meridian-chat');
    }
  } catch (error) {
    yield {
      type: 'error',
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

async function* runPrioritizeFlow(messageId: string): AsyncGenerator<StreamEvent> {
  const rankLabel = 'Querying ClickHouse: rank opportunities';
  yield {
    type: 'status',
    status: { id: 'st_rank', label: rankLabel, state: 'running', source: 'clickhouse', phase: 'querying' },
  };
  const rankStarted = Date.now();
  const ranked = await listOpportunitiesRanked({ time_window_days: WINDOW });
  yield {
    type: 'status',
    status: {
      id: 'st_rank',
      label: rankLabel,
      detail: `${withCommas(ranked.total_mentions_analyzed)} mentions · ${Date.now() - rankStarted}ms`,
      state: 'done',
      source: 'clickhouse',
      phase: 'querying',
    },
  };

  const rankingId = `${messageId}_ch0`;
  yield {
    type: 'chapter_start',
    chapter_id: rankingId,
    title: 'Q4 opportunity landscape',
    icon: 'ranking',
  };
  yield {
    type: 'chapter_visual',
    chapter_id: rankingId,
    visual: { type: 'opportunity_ranking', data: ranked },
  };
  yield { type: 'chapter_actions', chapter_id: rankingId, actions: rankingActions };

  const impactLabel = 'Querying ClickHouse: usage-based impact';
  yield {
    type: 'status',
    status: { id: 'st_impact', label: impactLabel, state: 'running', source: 'clickhouse', phase: 'querying' },
  };
  const impactStarted = Date.now();
  const impact = await getImpactProjection({ theme_id: 'usage_based_billing' });
  yield {
    type: 'status',
    status: {
      id: 'st_impact',
      label: impactLabel,
      detail: `${impact.breakdown.length} account inputs · ${Date.now() - impactStarted}ms`,
      state: 'done',
      source: 'clickhouse',
      phase: 'querying',
    },
  };

  const impactId = `${messageId}_ch1`;
  yield {
    type: 'chapter_start',
    chapter_id: impactId,
    title: 'Traceable impact',
    icon: 'impact',
  };
  yield {
    type: 'chapter_visual',
    chapter_id: impactId,
    visual: { type: 'impact_waterfall', data: impact },
  };
  yield { type: 'chapter_actions', chapter_id: impactId, actions: impactActions };

  yield {
    type: 'message_end',
    message_id: messageId,
    headline: 'You should prioritize usage-based billing.',
    suggested_followups: [
      'Why shouldn’t we prioritize dunning email customization?',
      'Tell me more about multi-entity consolidated invoicing',
      'Where are competitors beating us on usage-based billing?',
      'What does Figma want?',
      'Which themes are growing fastest over the last 90 days?',
    ],
  };
}
