import { query as chQuery } from '@/lib/db/clickhouse';
import type { ThemeId } from '@/types/theme';

/** Allowlisted flexible aggregation — no free-form SQL from the model. */

export const AGG_DIMENSIONS = ['theme', 'segment', 'industry', 'source_type', 'week'] as const;
export type AggDimension = (typeof AGG_DIMENSIONS)[number];

export const AGG_METRICS = [
  'mention_count',
  'unique_accounts',
  'requester_arr',
  'avg_severity',
  'tickets',
  'transcripts',
  'deal_losses',
] as const;
export type AggMetric = (typeof AGG_METRICS)[number];

export interface AggregateSignalsInput {
  group_by: AggDimension;
  metrics?: AggMetric[];
  theme_ids?: ThemeId[];
  segment?: 'enterprise' | 'mid_market' | 'smb' | 'all';
  industry?: string;
  source_type?: 'ticket' | 'transcript' | 'deal_loss' | 'all';
  time_window_days?: number;
  limit?: number;
}

export interface AggregateSignalsRow {
  key: string;
  label: string;
  mention_count: number;
  unique_accounts: number;
  requester_arr: number;
  avg_severity: number;
  tickets: number;
  transcripts: number;
  deal_losses: number;
}

export interface AggregateSignalsOutput {
  group_by: AggDimension;
  rows: AggregateSignalsRow[];
  filters: {
    theme_ids: string[];
    segment: string;
    industry?: string;
    source_type: string;
    time_window_days: number;
  };
  total_mentions: number;
  provenance: {
    source: 'ClickHouse';
    tables: string[];
    detail: string;
  };
}

interface RawRow {
  key: string;
  label: string;
  mention_count: number;
  unique_accounts: number;
  requester_arr: number;
  avg_severity: number;
  tickets: number;
  transcripts: number;
  deal_losses: number;
}

const metricSelect = `
  count() AS mention_count,
  uniqExact(m.account_id) AS unique_accounts,
  sum(toFloat64(a.arr)) AS requester_arr,
  round(avg(m.severity), 1) AS avg_severity,
  countIf(m.source_type = 'ticket') AS tickets,
  countIf(m.source_type = 'transcript') AS transcripts,
  countIf(m.source_type = 'deal_loss') AS deal_losses
`;

export const aggregateSignals = async (
  input: AggregateSignalsInput,
): Promise<AggregateSignalsOutput> => {
  const groupBy = input.group_by;
  if (!AGG_DIMENSIONS.includes(groupBy)) {
    throw new Error(`Unsupported group_by "${groupBy}"`);
  }

  const timeWindowDays = Math.min(Math.max(input.time_window_days ?? 180, 7), 365);
  const segment = input.segment ?? 'all';
  const sourceType = input.source_type ?? 'all';
  const themeIds = [...new Set(input.theme_ids ?? [])];
  const industry = input.industry?.trim() || undefined;
  const limit = Math.min(Math.max(input.limit ?? 12, 1), 40);

  const accountFilters = [
    segment === 'all' ? '' : 'AND a.segment = {segment:String}',
    industry ? 'AND positionCaseInsensitiveUTF8(a.industry, {industry:String}) > 0' : '',
  ]
    .filter(Boolean)
    .join('\n');
  const themeFilter = themeIds.length > 0 ? 'AND m.theme_id IN {theme_ids:Array(String)}' : '';
  const sourceFilter = sourceType === 'all' ? '' : 'AND m.source_type = {source_type:String}';

  const params: Record<string, unknown> = {
    window_days: timeWindowDays,
    segment,
    industry: industry ?? '',
    theme_ids: themeIds,
    source_type: sourceType,
    limit,
  };

  let selectKey: string;
  let selectLabel: string;
  let groupExpr: string;
  let orderExpr: string;

  switch (groupBy) {
    case 'theme':
      selectKey = 'm.theme_id AS key';
      selectLabel = 'any(t.name) AS label';
      groupExpr = 'm.theme_id';
      orderExpr = 'mention_count DESC';
      break;
    case 'segment':
      selectKey = 'a.segment AS key';
      selectLabel = 'a.segment AS label';
      groupExpr = 'a.segment';
      orderExpr = 'mention_count DESC';
      break;
    case 'industry':
      selectKey = 'a.industry AS key';
      selectLabel = 'a.industry AS label';
      groupExpr = 'a.industry';
      orderExpr = 'mention_count DESC';
      break;
    case 'source_type':
      selectKey = 'm.source_type AS key';
      selectLabel = 'm.source_type AS label';
      groupExpr = 'm.source_type';
      orderExpr = 'mention_count DESC';
      break;
    case 'week':
      selectKey = 'toString(toStartOfWeek(m.event_date)) AS key';
      selectLabel = 'toString(toStartOfWeek(m.event_date)) AS label';
      groupExpr = 'toStartOfWeek(m.event_date)';
      orderExpr = 'key ASC';
      break;
    default: {
      const _exhaustive: never = groupBy;
      throw new Error(`Unhandled group_by ${_exhaustive}`);
    }
  }

  const themeJoin =
    groupBy === 'theme'
      ? `INNER JOIN (
           SELECT id, name FROM default.public_themes FINAL WHERE _peerdb_is_deleted = 0
         ) AS t ON t.id = m.theme_id`
      : '';

  const sql = `
    SELECT ${selectKey}, ${selectLabel}, ${metricSelect}
    FROM mentions AS m
    INNER JOIN (
      SELECT id, toFloat64(arr) AS arr, segment, industry
      FROM default.public_accounts FINAL
      WHERE _peerdb_is_deleted = 0
    ) AS a ON a.id = m.account_id
    ${themeJoin}
    WHERE m.event_date >= today() - {window_days:UInt32}
      ${themeFilter}
      ${sourceFilter}
      ${accountFilters}
    GROUP BY ${groupExpr}
    ORDER BY ${orderExpr}
    LIMIT {limit:UInt32}
  `;

  const result = await chQuery<RawRow>(sql, params);
  const rows: AggregateSignalsRow[] = result.data.map((row) => ({
    key: String(row.key),
    label: String(row.label || row.key),
    mention_count: Number(row.mention_count) || 0,
    unique_accounts: Number(row.unique_accounts) || 0,
    requester_arr: Number(row.requester_arr) || 0,
    avg_severity: Number(row.avg_severity) || 0,
    tickets: Number(row.tickets) || 0,
    transcripts: Number(row.transcripts) || 0,
    deal_losses: Number(row.deal_losses) || 0,
  }));

  return {
    group_by: groupBy,
    rows,
    filters: {
      theme_ids: themeIds,
      segment,
      industry,
      source_type: sourceType,
      time_window_days: timeWindowDays,
    },
    total_mentions: rows.reduce((sum, row) => sum + row.mention_count, 0),
    provenance: {
      source: 'ClickHouse',
      tables: ['meridian.mentions', 'default.public_accounts', ...(groupBy === 'theme' ? ['default.public_themes'] : [])],
      detail: `Grouped by ${groupBy} · ${timeWindowDays}d window`,
    },
  };
};
