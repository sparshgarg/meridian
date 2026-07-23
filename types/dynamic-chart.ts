import { z } from 'zod';

/**
 * Constrained chart DSL — "codegen" without eval.
 * The LLM emits a DynamicChartSpec; Zod validates; DynamicChartRenderer maps
 * onto allowlisted Recharts/primitives. Never execute free-form JS.
 */

export const DYNAMIC_MARKS = [
  'bar',
  'grouped_bar',
  'stacked_bar',
  'horizontal_bar',
  'line',
  'area',
  'scatter',
  'kpi',
  'table',
] as const;

export type DynamicMark = (typeof DYNAMIC_MARKS)[number];

export const FieldTypeSchema = z.enum(['nominal', 'temporal', 'quantitative']);

export const EncodingChannelSchema = z.object({
  field: z.string().min(1).max(64),
  type: FieldTypeSchema,
  title: z.string().max(80).optional(),
});

export const DynamicChartPointSchema = z.record(
  z.string().max(64),
  z.union([z.string().max(200), z.number().finite(), z.null()]),
);

export const DynamicChartProvenanceSchema = z.object({
  source: z.literal('ClickHouse'),
  tables: z.array(z.string().max(80)).min(1).max(8),
  detail: z.string().max(200).optional(),
});

export const DynamicChartSpecSchema = z
  .object({
    title: z.string().min(1).max(120),
    mark: z.enum(DYNAMIC_MARKS),
    encoding: z.object({
      x: EncodingChannelSchema,
      y: EncodingChannelSchema,
      color: EncodingChannelSchema.optional(),
      size: EncodingChannelSchema.optional(),
    }),
    /** Flat rows — field names must match encoding channels / series keys. */
    data: z.array(DynamicChartPointSchema).max(60),
    /** Extra quantitative series fields for grouped/stacked/line/area. */
    series_fields: z.array(z.string().min(1).max(64)).max(8).optional(),
    series_labels: z.record(z.string().max(64), z.string().max(80)).optional(),
    caption: z.string().max(200).optional(),
    provenance: DynamicChartProvenanceSchema,
    why: z.string().max(200).optional(),
  })
  .superRefine((spec, ctx) => {
    if (spec.data.length === 0 && spec.mark !== 'kpi') {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Chart data is empty', path: ['data'] });
    }
    if ((spec.mark === 'grouped_bar' || spec.mark === 'stacked_bar' || spec.mark === 'line' || spec.mark === 'area')
      && (!spec.series_fields || spec.series_fields.length === 0)
      && spec.encoding.y.type === 'quantitative') {
      // Single-series still valid via encoding.y.field alone.
    }
    if (spec.mark === 'kpi' && spec.data.length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'KPI requires at least one row', path: ['data'] });
    }
  });

export type DynamicChartSpec = z.infer<typeof DynamicChartSpecSchema>;

export const AnswerPlanSchema = z.object({
  data_plan: z.object({
    intent: z.string().max(200),
    sources: z
      .array(
        z.enum([
          'mentions',
          'accounts_cdc',
          'themes_cdc',
          'competitors_cdc',
          'deals_cdc',
        ]),
      )
      .min(1)
      .max(5),
    preferred_tools: z
      .array(
        z.enum([
          'find_accounts',
          'list_top_accounts',
          'get_account_signals',
          'get_theme_trends',
          'get_competitive_position',
          'list_opportunities_ranked',
          'get_theme_evidence',
          'get_impact_projection',
          'compare_signals',
          'aggregate_signals',
          'report_no_data',
        ]),
      )
      .min(1)
      .max(4),
    filters: z
      .object({
        theme_ids: z.array(z.string()).max(8).optional(),
        segment: z.enum(['enterprise', 'mid_market', 'smb', 'all']).optional(),
        industry: z.string().max(80).optional(),
        time_window_days: z.number().int().min(7).max(365).optional(),
        account_query: z.string().max(80).optional(),
      })
      .optional(),
    metrics: z
      .array(
        z.enum([
          'mention_count',
          'unique_accounts',
          'requester_arr',
          'avg_severity',
          'tickets',
          'transcripts',
          'deal_losses',
        ]),
      )
      .max(6)
      .optional(),
  }),
  chart_plan: z.object({
    mark: z.enum(DYNAMIC_MARKS),
    why: z.string().max(200),
    use_existing_visual: z
      .enum([
        'none',
        'opportunity_ranking',
        'evidence_cards',
        'competitor_matrix',
        'impact_waterfall',
        'account_snapshot',
        'trend_lines',
        'comparison_bars',
        'source_mix',
        'dynamic_chart',
      ])
      .optional(),
  }),
  fallback: z.object({
    text_only: z.boolean(),
    reason: z.string().max(200).optional(),
  }),
});

export type AnswerPlan = z.infer<typeof AnswerPlanSchema>;

export const TextFallbackSchema = z.object({
  title: z.string().min(1).max(120),
  body: z.string().min(1).max(600),
  bullets: z.array(z.string().max(160)).max(5).optional(),
});

export type TextFallback = z.infer<typeof TextFallbackSchema>;
