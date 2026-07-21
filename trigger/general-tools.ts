import { tool } from 'ai';
import { chat } from '@trigger.dev/sdk/ai';
import { z } from 'zod';
import { findAccounts, getAccountSignals } from '@/lib/queries/account-signals';
import { getCompetitivePosition } from '@/lib/queries/competitive-position';
import { getImpactProjection } from '@/lib/queries/impact-projection';
import { listOpportunitiesRanked } from '@/lib/queries/opportunities-ranked';
import { getThemeTrends } from '@/lib/queries/signal-summary';
import { getThemeEvidence } from '@/lib/queries/theme-evidence';
import { toTrendLines } from '@/lib/queries/transforms';
import type { ChapterIcon, ChapterVisual, StreamEvent } from '@/types/chapter';
import type { ThemeId } from '@/types/theme';
import { chapterEvents } from './streams';

export const appendGeneralEvent = async (event: StreamEvent): Promise<void> => {
  await chapterEvents.append(event);
  chat.response.write({ type: 'data-chapter-event', data: event });
};

const runVisualTool = async <T>(
  messageId: string,
  key: string,
  label: string,
  title: string,
  icon: ChapterIcon,
  query: () => Promise<T>,
  visual: (data: T) => ChapterVisual,
  detail: (data: T, elapsed: number) => string,
): Promise<T> => {
  const statusId = `${messageId}_${key}`;
  await appendGeneralEvent({ type: 'status', status: { id: statusId, label, state: 'running' } });
  const started = Date.now();
  const data = await query();
  await appendGeneralEvent({
    type: 'status',
    status: { id: statusId, label, detail: detail(data, Date.now() - started), state: 'done' },
  });
  const chapterId = `${messageId}_${key}_chapter`;
  await appendGeneralEvent({ type: 'chapter_start', chapter_id: chapterId, title, icon });
  await appendGeneralEvent({ type: 'chapter_visual', chapter_id: chapterId, visual: visual(data) });
  return data;
};

export const createGeneralTools = (messageId: string) => ({
  find_accounts: tool({
    description:
      'Resolve an account or customer name from the ClickHouse CDC replica before requesting account signals.',
    inputSchema: z.object({ query: z.string().min(1), limit: z.number().int().min(1).max(10).optional() }),
    execute: async ({ query, limit }) => {
      const label = `Resolving account: ${query}`;
      const statusId = `${messageId}_account_search`;
      await appendGeneralEvent({ type: 'status', status: { id: statusId, label, state: 'running' } });
      const started = Date.now();
      const result = await findAccounts({ query, limit });
      await appendGeneralEvent({
        type: 'status',
        status: {
          id: statusId,
          label,
          detail: `${result.matches.length} matching accounts · ${Date.now() - started}ms`,
          state: 'done',
        },
      });
      return result;
    },
  }),
  get_account_signals: tool({
    description:
      'Get one resolved account’s ClickHouse themes, source evidence, and replicated deal context.',
    inputSchema: z.object({ account_id: z.string().uuid(), evidence_limit: z.number().int().min(1).max(20).optional() }),
    execute: async ({ account_id, evidence_limit }) => {
      const data = await runVisualTool(
        messageId,
        'account',
        'Querying ClickHouse: account signals and evidence',
        'Account signal snapshot',
        'evidence',
        () => getAccountSignals({ account_id, evidence_limit }),
        (result) => {
          if (!result) throw new Error('Resolved account no longer exists');
          return { type: 'account_snapshot', data: result };
        },
        (result, elapsed) => `${result?.total_mentions ?? 0} signals · ${elapsed}ms`,
      );
      return data;
    },
  }),
  get_theme_trends: tool({
    description: 'Get weekly ClickHouse mention trends across themes to identify what is growing.',
    inputSchema: z.object({ weeks: z.number().int().min(4).max(52).optional() }),
    execute: async ({ weeks }) =>
      runVisualTool(
        messageId,
        'trends',
        'Querying ClickHouse: weekly theme trends',
        'Fastest-growing themes',
        'trend',
        () => getThemeTrends(weeks ?? 24),
        (data) => ({ type: 'trend_lines', data: { series: toTrendLines(data) } }),
        (data, elapsed) => `${data.length} themes · ${elapsed}ms`,
      ),
  }),
  get_competitive_position: tool({
    description: 'Get the real competitor feature matrix, optionally filtered to one theme.',
    inputSchema: z.object({ theme_id: z.string().optional() }),
    execute: async ({ theme_id }) =>
      runVisualTool(
        messageId,
        'competitors',
        'Reading ClickHouse: replicated competitor reference',
        'Competitive position',
        'swords',
        () => getCompetitivePosition({ theme_id: theme_id as ThemeId | undefined }),
        (data) => ({ type: 'competitor_matrix', data }),
        (data, elapsed) => `${data.competitors.length} competitors · ${elapsed}ms`,
      ),
  }),
  list_opportunities_ranked: tool({
    description: 'Rank product themes using real ARR-weighted ClickHouse signals.',
    inputSchema: z.object({ time_window_days: z.number().int().min(30).max(365).optional() }),
    execute: async ({ time_window_days }) =>
      runVisualTool(
        messageId,
        'ranking',
        'Querying ClickHouse: ranked opportunities',
        'Opportunity comparison',
        'ranking',
        () => listOpportunitiesRanked({ time_window_days: time_window_days ?? 180 }),
        (data) => ({ type: 'opportunity_ranking', data }),
        (data, elapsed) => `${data.total_mentions_analyzed} mentions · ${elapsed}ms`,
      ),
  }),
  get_theme_evidence: tool({
    description: 'Get verbatim, traceable source evidence for a known theme id.',
    inputSchema: z.object({ theme_id: z.string(), limit: z.number().int().min(1).max(20).optional() }),
    execute: async ({ theme_id, limit }) =>
      runVisualTool(
        messageId,
        'evidence',
        'Querying ClickHouse: theme evidence',
        'Source evidence',
        'evidence',
        () => getThemeEvidence({ theme_id: theme_id as ThemeId, limit }),
        (data) => ({ type: 'evidence_cards', data }),
        (data, elapsed) => `${data.evidence.length} sources · ${elapsed}ms`,
      ),
  }),
  get_impact_projection: tool({
    description: 'Get traceable ARR impact for a known theme id.',
    inputSchema: z.object({ theme_id: z.string() }),
    execute: async ({ theme_id }) =>
      runVisualTool(
        messageId,
        'impact',
        'Querying ClickHouse: theme impact',
        'Traceable impact',
        'impact',
        () => getImpactProjection({ theme_id: theme_id as ThemeId }),
        (data) => ({ type: 'impact_waterfall', data }),
        (data, elapsed) => `${data.breakdown.length} account inputs · ${elapsed}ms`,
      ),
  }),
});
