import { query as chQuery } from '@/lib/db/clickhouse';
import type {
  CompareSignalsInput,
  CompareSignalsOutput,
  SignalComparisonRow,
} from '@/types/agent-tools';

interface ComparisonRow {
  theme_id: string;
  theme_name: string;
  mention_count: number;
  unique_accounts: number;
  requester_arr: number;
  avg_severity: number;
  tickets: number;
  transcripts: number;
  deal_losses: number;
}

export const compareSignals = async (input: CompareSignalsInput): Promise<CompareSignalsOutput> => {
  const timeWindowDays = Math.min(Math.max(input.time_window_days ?? 180, 7), 365);
  const segment = input.segment ?? 'all';
  const themeIds = [...new Set(input.theme_ids ?? [])];
  const industry = input.industry?.trim() || undefined;
  const accountFilters = [
    segment === 'all' ? '' : 'AND segment = {segment:String}',
    industry ? 'AND positionCaseInsensitiveUTF8(industry, {industry:String}) > 0' : '',
  ].filter(Boolean).join('\n');
  const themeFilter = themeIds.length > 0 ? 'AND m.theme_id IN {theme_ids:Array(String)}' : '';
  const params: Record<string, unknown> = {
    window_days: timeWindowDays,
    segment,
    industry: industry ?? '',
    theme_ids: themeIds,
  };

  const [comparison, accounts] = await Promise.all([
    chQuery<ComparisonRow>(
      `SELECT grouped.theme_id, any(t.name) AS theme_name,
              sum(grouped.mention_count) AS mention_count,
              count() AS unique_accounts,
              sum(grouped.arr) AS requester_arr,
              round(sum(grouped.severity_sum) / sum(grouped.mention_count), 1) AS avg_severity,
              sum(grouped.tickets) AS tickets,
              sum(grouped.transcripts) AS transcripts,
              sum(grouped.deal_losses) AS deal_losses
       FROM (
         SELECT m.theme_id, m.account_id, any(a.arr) AS arr,
                count() AS mention_count, sum(m.severity) AS severity_sum,
                countIf(m.source_type = 'ticket') AS tickets,
                countIf(m.source_type = 'transcript') AS transcripts,
                countIf(m.source_type = 'deal_loss') AS deal_losses
         FROM mentions AS m
         INNER JOIN (
           SELECT id, toFloat64(arr) AS arr
           FROM default.public_accounts FINAL
           WHERE _peerdb_is_deleted = 0
           ${accountFilters}
         ) AS a ON a.id = m.account_id
         WHERE m.event_date >= today() - {window_days:UInt32}
           ${themeFilter}
         GROUP BY m.theme_id, m.account_id
       ) AS grouped
       INNER JOIN (
         SELECT id, name FROM default.public_themes FINAL
         WHERE _peerdb_is_deleted = 0
       ) AS t ON t.id = grouped.theme_id
       GROUP BY grouped.theme_id
       ORDER BY mention_count DESC`,
      params,
    ),
    chQuery<{ n: number }>(
      `SELECT count() AS n FROM default.public_accounts FINAL
       WHERE _peerdb_is_deleted = 0
       ${accountFilters}`,
      params,
    ),
  ]);

  const rows: SignalComparisonRow[] = comparison.data.map((row) => ({
    theme_id: row.theme_id,
    theme_name: row.theme_name,
    mention_count: row.mention_count,
    unique_accounts: row.unique_accounts,
    requester_arr: row.requester_arr,
    avg_severity: row.avg_severity,
    source_counts: {
      tickets: row.tickets,
      transcripts: row.transcripts,
      deal_losses: row.deal_losses,
    },
  }));

  return {
    rows,
    filters: { theme_ids: themeIds, segment, industry, time_window_days: timeWindowDays },
    total_mentions: rows.reduce((sum, row) => sum + row.mention_count, 0),
    matched_accounts: accounts.data[0]?.n ?? 0,
    provenance: {
      source: 'ClickHouse',
      tables: ['mentions', 'accounts (CDC)', 'themes (CDC)'],
    },
  };
};
