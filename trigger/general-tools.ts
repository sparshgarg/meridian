import { tool } from 'ai';
import { chat } from '@trigger.dev/sdk/ai';
import { z } from 'zod';
import { findAccounts, getAccountSignals } from '@/lib/queries/account-signals';
import { getCompetitivePosition } from '@/lib/queries/competitive-position';
import { getImpactProjection } from '@/lib/queries/impact-projection';
import { listOpportunitiesRanked } from '@/lib/queries/opportunities-ranked';
import { getThemeTrends } from '@/lib/queries/signal-summary';
import { getThemeEvidence } from '@/lib/queries/theme-evidence';
import { compareSignals } from '@/lib/queries/signal-comparison';
import {
  AGG_DIMENSIONS,
  AGG_METRICS,
  aggregateSignals,
} from '@/lib/queries/aggregate-signals';
import { toTrendLines } from '@/lib/queries/transforms';
import type {
  ChapterIcon,
  ChapterVisual,
  NoDataOutcome,
  StreamEvent,
  VisualAction,
} from '@/types/chapter';
import type { ThemeId } from '@/types/theme';
import {
  AnswerPlanSchema,
  DynamicChartSpecSchema,
  TextFallbackSchema,
} from '@/types/dynamic-chart';
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
  await appendGeneralEvent({
    type: 'status',
    status: { id: statusId, label, state: 'running', source: 'clickhouse', phase: 'querying' },
  });
  const started = Date.now();
  let data: T;
  try {
    data = await query();
  } catch (error) {
    await appendGeneralEvent({
      type: 'status',
      status: {
        id: statusId,
        label,
        detail: 'Query failed',
        state: 'error',
        source: 'clickhouse',
        phase: 'querying',
      },
    });
    throw error;
  }
  await appendGeneralEvent({
    type: 'status',
    status: {
      id: statusId,
      label,
      detail: detail(data, Date.now() - started),
      state: 'done',
      source: 'clickhouse',
      phase: 'querying',
    },
  });
  const assembleId = `${messageId}_${key}_assemble`;
  await appendGeneralEvent({
    type: 'status',
    status: {
      id: assembleId,
      label: 'Assembling the best visual',
      state: 'running',
      source: 'agent',
      phase: 'analyzing',
    },
  });
  const chapterId = `${messageId}_${key}_chapter`;
  await appendGeneralEvent({ type: 'chapter_start', chapter_id: chapterId, title, icon });
  await appendGeneralEvent({ type: 'chapter_visual', chapter_id: chapterId, visual: visual(data) });
  await appendGeneralEvent({
    type: 'status',
    status: {
      id: assembleId,
      label: 'Assembling the best visual',
      detail: 'Ready',
      state: 'done',
      source: 'agent',
      phase: 'analyzing',
    },
  });
  return data;
};

const recordNoData = async (
  emitted: Set<string>,
  outcome: NoDataOutcome,
): Promise<boolean> => {
  if (emitted.size > 0) return false;
  emitted.add(outcome.reason);
  await appendGeneralEvent({ type: 'no_data', outcome });
  return true;
};

const emitNoData = async (
  messageId: string,
  key: string,
  outcome: NoDataOutcome,
  emitted: Set<string>,
): Promise<void> => {
  if (!await recordNoData(emitted, outcome)) return;
  const chapterId = `${messageId}_${key}_chapter`;
  await appendGeneralEvent({
    type: 'chapter_start',
    chapter_id: chapterId,
    title: outcome.title,
    icon: 'summary',
  });
  await appendGeneralEvent({
    type: 'chapter_visual',
    chapter_id: chapterId,
    visual: { type: 'no_data', data: outcome },
  });
};

const followupsByMessage = new Map<string, string[]>();

export const getSuggestedFollowups = (messageId: string): string[] =>
  followupsByMessage.get(messageId) ?? [];

export const createGeneralTools = (messageId: string) => {
  const emittedNoData = new Set<string>();
  let planned = false;
  followupsByMessage.set(messageId, []);
  return ({
  plan_answer: tool({
    description:
      'ALWAYS call first for novel questions. Plan which ClickHouse sources/tools to use and which chart mark fits. Prefer existing typed visuals when they already match; otherwise plan aggregate_signals + render_dynamic_chart. Set fallback.text_only when a chart is inappropriate.',
    inputSchema: AnswerPlanSchema,
    execute: async (plan) => {
      planned = true;
      const statusId = `${messageId}_plan`;
      await appendGeneralEvent({
        type: 'status',
        status: {
          id: statusId,
          label: 'Planning answer',
          detail: plan.fallback.text_only
            ? `Text fallback · ${plan.fallback.reason ?? 'chart not appropriate'}`
            : `${plan.chart_plan.mark} · ${plan.data_plan.preferred_tools.join(', ')}`,
          state: 'done',
          source: 'agent',
          phase: 'planning',
        },
      });
      return plan;
    },
  }),
  suggest_followups: tool({
    description:
      'Call near the end with 3–5 short follow-up questions the PM can ask next. Prefer concrete Meridian data questions (accounts, themes, competitors, segments, trends).',
    inputSchema: z.object({
      questions: z.array(z.string().min(8).max(140)).min(3).max(5),
    }),
    execute: async ({ questions }) => {
      const next = questions.slice(0, 5);
      followupsByMessage.set(messageId, next);
      return { ok: true as const, count: next.length };
    },
  }),
  find_accounts: tool({
    description:
      'Resolve an account or customer name from the ClickHouse CDC replica before requesting account signals.',
    inputSchema: z.object({ query: z.string().min(1), limit: z.number().int().min(1).max(10).optional() }),
    execute: async ({ query, limit }) => {
      const label = `Resolving account: ${query}`;
      const statusId = `${messageId}_account_search`;
      await appendGeneralEvent({
        type: 'status',
        status: {
          id: statusId,
          label: 'Querying ClickHouse: accounts (CDC)',
          detail: `Searching for ${query}`,
          state: 'running',
          source: 'clickhouse',
          phase: 'querying',
        },
      });
      const started = Date.now();
      const result = await findAccounts({ query, limit });
      await appendGeneralEvent({
        type: 'status',
        status: {
          id: statusId,
          label,
          detail: `${result.matches.length} matching accounts · ${Date.now() - started}ms`,
          state: 'done',
          source: 'clickhouse',
          phase: 'querying',
        },
      });
      if (result.matches.length === 0) {
        await emitNoData(messageId, 'unknown_account', {
          reason: 'unknown_entity',
          title: 'Account not found',
          message: `I couldn’t find “${query}” in Meridian’s replicated account directory.`,
          suggestions: ['What does Figma want?', 'Which enterprise themes are strongest?'],
        }, emittedNoData);
      }
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
          if (result.total_mentions === 0) {
            return {
              type: 'no_data',
              data: {
                reason: 'known_no_evidence',
                title: 'Account found, but no evidence',
                message: `I found ${result.account.account_name}, but there are no matching tickets, interviews, or deal signals in ClickHouse.`,
                suggestions: ['What does Figma want?', 'Which enterprise themes are strongest?'],
              },
            };
          }
          return { type: 'account_snapshot', data: result };
        },
        (result, elapsed) => `${result?.total_mentions ?? 0} signals · ${elapsed}ms`,
      );
      if (data?.total_mentions === 0) {
        await recordNoData(emittedNoData, {
            reason: 'known_no_evidence',
            title: 'Account found, but no evidence',
            message: `I found ${data.account.account_name}, but there are no matching tickets, interviews, or deal signals in ClickHouse.`,
            suggestions: ['What does Figma want?', 'Which enterprise themes are strongest?'],
        });
      }
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
  compare_signals: tool({
    description:
      'Compare themes or inspect source mix with optional segment, industry, and time-window filters. Use comparison_bars for theme/value comparisons and source_mix when the question asks which source drives demand.',
    inputSchema: z.object({
      theme_ids: z.array(z.string()).max(8).optional(),
      segment: z.enum(['enterprise', 'mid_market', 'smb', 'all']).optional(),
      industry: z.string().min(1).max(80).optional(),
      time_window_days: z.number().int().min(7).max(365).optional(),
      visual_kind: z.enum(['comparison_bars', 'source_mix']),
    }),
    execute: async ({ theme_ids, segment, industry, time_window_days, visual_kind }) => {
      const data = await runVisualTool(
        messageId,
        `compare_${visual_kind}`,
        'Querying ClickHouse: mentions + accounts (CDC) + themes (CDC)',
        visual_kind === 'source_mix' ? 'What is driving demand' : 'Signal comparison',
        visual_kind === 'source_mix' ? 'summary' : 'ranking',
        () => compareSignals({
          theme_ids: theme_ids as ThemeId[] | undefined,
          segment,
          industry,
          time_window_days,
        }),
        (result) => {
          if (result.rows.length > 0) return { type: visual_kind, data: result };
          const unknownIndustry = Boolean(industry) && result.matched_accounts === 0;
          return {
            type: 'no_data',
            data: {
              reason: unknownIndustry ? 'unknown_entity' : 'known_no_evidence',
              title: unknownIndustry ? 'No matching customer segment' : 'No matching evidence',
              message: unknownIndustry
                ? `I couldn’t find accounts matching “${industry}” in Meridian’s account data.`
                : 'I couldn’t find evidence for that filter in Meridian’s tickets, interviews, deals, or competitor data.',
              suggestions: ['Compare usage-based billing with dunning for enterprise accounts', 'Which themes grew in the last 90 days?'],
            },
          };
        },
        (result, elapsed) => `${result.total_mentions} rows analyzed · ${elapsed}ms`,
      );
      if (data.rows.length > 0) {
        const actions: VisualAction[] = [];
        if (data.rows.some((row) => row.theme_id === 'usage_based_billing')) {
          actions.push({
            id: 'why_usage',
            label: 'Show usage evidence',
            aria_label: 'Query evidence for usage-based billing',
            theme_id: 'usage_based_billing',
          });
        }
        if (data.rows.some((row) => row.theme_id === 'dunning_customization')) {
          actions.push({
            id: 'why_not_dunning',
            label: 'Inspect dunning value',
            aria_label: 'Query why dunning should not be prioritized',
            theme_id: 'dunning_customization',
          });
        }
        if (data.rows.some((row) => row.theme_id === 'multi_entity_invoicing')) {
          actions.push({
            id: 'explore_multi_entity',
            label: 'Show multi-entity evidence',
            aria_label: 'Query multi-entity invoicing evidence',
            theme_id: 'multi_entity_invoicing',
          });
        }
        if (actions.length > 0) {
          await appendGeneralEvent({
            type: 'chapter_actions',
            chapter_id: `${messageId}_compare_${visual_kind}_chapter`,
            actions,
          });
        }
      }
      if (data.rows.length === 0) {
        const unknownIndustry = Boolean(industry) && data.matched_accounts === 0;
        await recordNoData(emittedNoData, {
          reason: unknownIndustry ? 'unknown_entity' : 'known_no_evidence',
          title: unknownIndustry ? 'No matching customer segment' : 'No matching evidence',
          message: unknownIndustry
            ? `I couldn’t find accounts matching “${industry}” in Meridian’s account data.`
            : 'I couldn’t find evidence for that filter in Meridian’s tickets, interviews, deals, or competitor data.',
          suggestions: ['Compare usage-based billing with dunning for enterprise accounts', 'Which themes grew in the last 90 days?'],
        });
      }
      return data;
    },
  }),
  aggregate_signals: tool({
    description:
      'Flexible allowlisted ClickHouse aggregation for novel charts. group_by is one of theme|segment|industry|source_type|week. Returns rows the model must pass into render_dynamic_chart. Never invent numbers.',
    inputSchema: z.object({
      group_by: z.enum(AGG_DIMENSIONS),
      metrics: z.array(z.enum(AGG_METRICS)).max(6).optional(),
      theme_ids: z.array(z.string()).max(8).optional(),
      segment: z.enum(['enterprise', 'mid_market', 'smb', 'all']).optional(),
      industry: z.string().min(1).max(80).optional(),
      source_type: z.enum(['ticket', 'transcript', 'deal_loss', 'all']).optional(),
      time_window_days: z.number().int().min(7).max(365).optional(),
      limit: z.number().int().min(1).max(40).optional(),
    }),
    execute: async (input) => {
      const statusId = `${messageId}_aggregate`;
      await appendGeneralEvent({
        type: 'status',
        status: {
          id: statusId,
          label: `Querying ClickHouse: aggregate by ${input.group_by}`,
          state: 'running',
          source: 'clickhouse',
          phase: 'querying',
        },
      });
      const started = Date.now();
      try {
        const data = await aggregateSignals({
          ...input,
          theme_ids: input.theme_ids as ThemeId[] | undefined,
        });
        await appendGeneralEvent({
          type: 'status',
          status: {
            id: statusId,
            label: `Querying ClickHouse: aggregate by ${input.group_by}`,
            detail: `${data.rows.length} groups · ${data.total_mentions} mentions · ${Date.now() - started}ms`,
            state: 'done',
            source: 'clickhouse',
            phase: 'querying',
          },
        });
        if (data.rows.length === 0) {
          await emitNoData(messageId, 'aggregate_empty', {
            reason: 'known_no_evidence',
            title: 'No matching evidence',
            message: 'I couldn’t find aggregated signal for that filter in ClickHouse.',
            suggestions: [
              'Break signal volume down by customer segment',
              'Compare usage-based billing with dunning for enterprise accounts',
            ],
          }, emittedNoData);
        }
        return data;
      } catch (error) {
        await appendGeneralEvent({
          type: 'status',
          status: {
            id: statusId,
            label: `Querying ClickHouse: aggregate by ${input.group_by}`,
            detail: 'Query failed',
            state: 'error',
            source: 'clickhouse',
            phase: 'querying',
          },
        });
        throw error;
      }
    },
  }),
  render_dynamic_chart: tool({
    description:
      'Generate a canvas chart from a Zod-validated DynamicChartSpec (constrained DSL — not free JS). Call after aggregate_signals or after reshaping other tool rows. Include provenance from the query.',
    inputSchema: DynamicChartSpecSchema,
    execute: async (rawSpec) => {
      const parsed = DynamicChartSpecSchema.safeParse(rawSpec);
      const genId = `${messageId}_chartgen`;
      await appendGeneralEvent({
        type: 'status',
        status: {
          id: genId,
          label: 'Generating chart',
          state: 'running',
          source: 'agent',
          phase: 'analyzing',
        },
      });
      if (!parsed.success) {
        await appendGeneralEvent({
          type: 'status',
          status: {
            id: genId,
            label: 'Generating chart',
            detail: 'Spec validation failed — using text fallback',
            state: 'error',
            source: 'agent',
            phase: 'analyzing',
          },
        });
        const fallback = {
          title: 'Could not render chart',
          body: 'The chart specification failed validation, so I’m answering in text instead of guessing a visual.',
          bullets: parsed.error.issues.slice(0, 3).map((issue) => issue.message),
        };
        const chapterId = `${messageId}_text_fallback_chapter`;
        await appendGeneralEvent({
          type: 'chapter_start',
          chapter_id: chapterId,
          title: fallback.title,
          icon: 'summary',
        });
        await appendGeneralEvent({
          type: 'chapter_visual',
          chapter_id: chapterId,
          visual: { type: 'text_fallback', data: fallback },
        });
        return { ok: false as const, fallback };
      }
      const spec = parsed.data;
      if (spec.data.length === 0) {
        await appendGeneralEvent({
          type: 'status',
          status: {
            id: genId,
            label: 'Generating chart',
            detail: 'Empty data — text fallback',
            state: 'done',
            source: 'agent',
            phase: 'analyzing',
          },
        });
        const fallback = {
          title: 'No chartable rows',
          body: 'ClickHouse returned no rows for that slice, so a chart would be misleading.',
        };
        const chapterId = `${messageId}_empty_chart_chapter`;
        await appendGeneralEvent({
          type: 'chapter_start',
          chapter_id: chapterId,
          title: fallback.title,
          icon: 'summary',
        });
        await appendGeneralEvent({
          type: 'chapter_visual',
          chapter_id: chapterId,
          visual: { type: 'text_fallback', data: fallback },
        });
        return { ok: false as const, fallback };
      }
      const chapterId = `${messageId}_dynamic_chapter`;
      await appendGeneralEvent({
        type: 'chapter_start',
        chapter_id: chapterId,
        title: spec.title,
        icon: spec.mark === 'line' || spec.mark === 'area' ? 'trend' : 'ranking',
      });
      await appendGeneralEvent({
        type: 'chapter_visual',
        chapter_id: chapterId,
        visual: { type: 'dynamic_chart', data: spec },
      });
      await appendGeneralEvent({
        type: 'status',
        status: {
          id: genId,
          label: 'Generating chart',
          detail: `${spec.mark} · ${spec.data.length} rows`,
          state: 'done',
          source: 'agent',
          phase: 'analyzing',
        },
      });
      return { ok: true as const, mark: spec.mark, rows: spec.data.length, planned };
    },
  }),
  render_text_answer: tool({
    description:
      'Short text-only canvas answer when a chart is inappropriate or data cannot be visualized. Keep body under ~3 sentences.',
    inputSchema: TextFallbackSchema,
    execute: async (payload) => {
      const parsed = TextFallbackSchema.parse(payload);
      const statusId = `${messageId}_text`;
      await appendGeneralEvent({
        type: 'status',
        status: {
          id: statusId,
          label: 'Preparing text answer',
          detail: planned ? 'Per plan fallback' : 'Chart not appropriate',
          state: 'done',
          source: 'agent',
          phase: 'analyzing',
        },
      });
      const chapterId = `${messageId}_text_chapter`;
      await appendGeneralEvent({
        type: 'chapter_start',
        chapter_id: chapterId,
        title: parsed.title,
        icon: 'summary',
      });
      await appendGeneralEvent({
        type: 'chapter_visual',
        chapter_id: chapterId,
        visual: { type: 'text_fallback', data: parsed },
      });
      return parsed;
    },
  }),
  report_no_data: tool({
    description:
      'Use when a request is outside Meridian Billing data, or when the available tools cannot answer it. Never redirect an unsupported request to prioritization.',
    inputSchema: z.object({
      reason: z.enum(['known_no_evidence', 'unknown_entity', 'unsupported']),
      subject: z.string().max(120),
    }),
    execute: async ({ reason, subject }) => {
      const outcome: NoDataOutcome = {
        reason,
        title: reason === 'unsupported' ? 'Outside Meridian’s data' : 'No matching evidence',
        message: reason === 'unsupported'
          ? `I can’t answer “${subject}” from Meridian’s product data. I cover tickets, interviews, deals, accounts, themes, and competitors.`
          : `I couldn’t find evidence for “${subject}” in Meridian’s tickets, interviews, deals, or competitor data.`,
        suggestions: ['What does Figma want?', 'Which themes are growing fastest?', 'Compare usage-based billing with dunning'],
      };
      await emitNoData(messageId, 'no_data', outcome, emittedNoData);
      return outcome;
    },
  }),
  });
};
