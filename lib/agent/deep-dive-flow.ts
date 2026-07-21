import type { StreamEvent, VisualAction } from '@/types/chapter';
import type { OpportunityRow } from '@/types/agent-tools';
import { getCompetitivePosition } from '@/lib/queries/competitive-position';
import { getImpactProjection } from '@/lib/queries/impact-projection';
import { listOpportunitiesRanked } from '@/lib/queries/opportunities-ranked';
import { getThemeVolumeStats } from '@/lib/queries/signal-summary';
import { getThemeEvidence } from '@/lib/queries/theme-evidence';
import { toVolumeTrap } from '@/lib/queries/transforms';
import type { FlowKind } from './stream-helpers';
import { usdCompact, withCommas } from './stream-helpers';

const WINDOW = 180;

const impactAction: VisualAction = {
  id: 'impact_details',
  label: 'See impact assumptions',
  aria_label: 'Query the assumptions behind usage-based billing impact',
  theme_id: 'usage_based_billing',
};

const findTheme = (rows: OpportunityRow[], id: string): OpportunityRow | undefined =>
  rows.find((row) => row.theme_id === id);

const doneStatus = (id: string, label: string, detail: string): StreamEvent => ({
  type: 'status',
  status: { id, label, detail, state: 'done', source: 'clickhouse', phase: 'querying' },
});

export async function* runDeepDiveFlow(
  kind: Exclude<FlowKind, 'prioritize' | 'general'>,
  messageId: string,
): AsyncGenerator<StreamEvent> {
  if (kind === 'dunning') yield* runDunning(messageId);
  if (kind === 'competitive') yield* runCompetitive(messageId);
  if (kind === 'usage_evidence') yield* runUsageEvidence(messageId);
  if (kind === 'multi_entity') yield* runMultiEntity(messageId);
  if (kind === 'impact_details') yield* runImpactDetails(messageId);
}

async function* runUsageEvidence(messageId: string): AsyncGenerator<StreamEvent> {
  const label = 'Querying ClickHouse: usage-based evidence';
  yield { type: 'status', status: { id: 'st_usage', label, state: 'running', source: 'clickhouse', phase: 'querying' } };
  const started = Date.now();
  const [evidence, ranked] = await Promise.all([
    getThemeEvidence({ theme_id: 'usage_based_billing', limit: 8 }),
    listOpportunitiesRanked({ time_window_days: WINDOW }),
  ]);
  const usage = findTheme(ranked.opportunities, 'usage_based_billing');
  yield doneStatus(
    'st_usage',
    label,
    `${evidence.evidence.length} sources · ${withCommas(ranked.total_mentions_analyzed)} mentions · ${Date.now() - started}ms`,
  );
  const chapterId = `${messageId}_ch0`;
  yield { type: 'chapter_start', chapter_id: chapterId, title: 'Why usage-based wins', icon: 'evidence' };
  yield { type: 'chapter_visual', chapter_id: chapterId, visual: { type: 'evidence_cards', data: evidence } };
  yield { type: 'chapter_actions', chapter_id: chapterId, actions: [impactAction] };
  yield {
    type: 'message_end',
    message_id: messageId,
    headline: `Usage-based billing leads with signal ${usage?.signal_strength ?? '—'} and ${usage?.mention_counts.deal_losses ?? 0} blocked deals.`,
  };
}

async function* runDunning(messageId: string): AsyncGenerator<StreamEvent> {
  const label = 'Querying ClickHouse: dunning volume versus value';
  yield { type: 'status', status: { id: 'st_dunning', label, state: 'running', source: 'clickhouse', phase: 'querying' } };
  const started = Date.now();
  const [ranked, volume] = await Promise.all([
    listOpportunitiesRanked({ time_window_days: WINDOW }),
    getThemeVolumeStats(WINDOW),
  ]);
  const dunning = findTheme(ranked.opportunities, 'dunning_customization');
  const points = toVolumeTrap(volume).map((point) => ({
    ...point,
    emphasis:
      point.theme_id === 'dunning_customization'
        ? ('trap' as const)
        : point.theme_id === 'multi_entity_invoicing'
          ? ('gem' as const)
          : null,
  }));
  yield doneStatus(
    'st_dunning',
    label,
    `${withCommas(ranked.total_mentions_analyzed)} mentions compared · ${Date.now() - started}ms`,
  );
  const chapterId = `${messageId}_ch0`;
  yield { type: 'chapter_start', chapter_id: chapterId, title: 'Why not dunning', icon: 'trap' };
  yield { type: 'chapter_visual', chapter_id: chapterId, visual: { type: 'volume_trap', data: { points } } };
  yield {
    type: 'message_end',
    message_id: messageId,
    headline: `Dunning is loud but ranks ${dunning?.recommendation ?? 'deprioritize'}: ${dunning?.n_enterprise_accounts ?? 0} enterprise accounts and ${dunning?.mention_counts.deal_losses ?? 0} blocked deals.`,
  };
}

async function* runMultiEntity(messageId: string): AsyncGenerator<StreamEvent> {
  const label = 'Querying ClickHouse: multi-entity evidence';
  yield { type: 'status', status: { id: 'st_multi', label, state: 'running', source: 'clickhouse', phase: 'querying' } };
  const started = Date.now();
  const [evidence, ranked] = await Promise.all([
    getThemeEvidence({ theme_id: 'multi_entity_invoicing', limit: 8 }),
    listOpportunitiesRanked({ time_window_days: WINDOW }),
  ]);
  const multi = findTheme(ranked.opportunities, 'multi_entity_invoicing');
  yield doneStatus(
    'st_multi',
    label,
    `${evidence.evidence.length} sources · ${evidence.requesting_accounts.length} accounts · ${Date.now() - started}ms`,
  );
  const chapterId = `${messageId}_ch0`;
  yield { type: 'chapter_start', chapter_id: chapterId, title: 'Multi-entity, unpacked', icon: 'gem' };
  yield { type: 'chapter_visual', chapter_id: chapterId, visual: { type: 'evidence_cards', data: evidence } };
  yield {
    type: 'message_end',
    message_id: messageId,
    headline: `Multi-entity is the #2 signal at ${multi?.signal_strength ?? '—'}: quiet demand, enterprise value, greenfield.`,
  };
}

async function* runCompetitive(messageId: string): AsyncGenerator<StreamEvent> {
  const label = 'Cross-checking ClickHouse signal with competitor data';
  yield { type: 'status', status: { id: 'st_comp', label, state: 'running', source: 'clickhouse', phase: 'querying' } };
  const started = Date.now();
  const [usage, multi, ranked] = await Promise.all([
    getCompetitivePosition({ theme_id: 'usage_based_billing' }),
    getCompetitivePosition({ theme_id: 'multi_entity_invoicing' }),
    listOpportunitiesRanked({ time_window_days: WINDOW }),
  ]);
  yield doneStatus(
    'st_comp',
    label,
    `${withCommas(ranked.total_mentions_analyzed)} mentions + ${usage.competitors.length} competitors · ${Date.now() - started}ms`,
  );
  const chapterId = `${messageId}_ch0`;
  yield { type: 'chapter_start', chapter_id: chapterId, title: 'Competitive insight', icon: 'swords' };
  yield {
    type: 'chapter_visual',
    chapter_id: chapterId,
    visual: {
      type: 'competitor_matrix',
      data: { competitors: usage.competitors, features: [...usage.features, ...multi.features] },
    },
  };
  yield {
    type: 'message_end',
    message_id: messageId,
    headline: 'Usage-based is the exposed gap; multi-entity remains greenfield.',
  };
}

async function* runImpactDetails(messageId: string): AsyncGenerator<StreamEvent> {
  const label = 'Querying ClickHouse: impact assumptions';
  yield { type: 'status', status: { id: 'st_impact', label, state: 'running', source: 'clickhouse', phase: 'querying' } };
  const started = Date.now();
  const impact = await getImpactProjection({ theme_id: 'usage_based_billing' });
  yield doneStatus(
    'st_impact',
    label,
    `${impact.breakdown.length} account-level inputs · ${Date.now() - started}ms`,
  );
  const chapterId = `${messageId}_ch0`;
  yield { type: 'chapter_start', chapter_id: chapterId, title: 'Impact assumptions', icon: 'impact' };
  yield {
    type: 'chapter_visual',
    chapter_id: chapterId,
    visual: { type: 'impact_breakdown', data: impact },
  };
  yield {
    type: 'message_end',
    message_id: messageId,
    headline: `${usdCompact(impact.total)} traceable impact across ${impact.breakdown.length} account-level inputs.`,
  };
}
