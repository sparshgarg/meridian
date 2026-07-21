import { query as chQuery } from '@/lib/db/clickhouse';
import type { GetThemeEvidenceInput, GetThemeEvidenceOutput, EvidenceItem } from '@/types/agent-tools';
import type { Account } from '@/types/account';

interface MentionRow {
  source_type: EvidenceItem['source_type'];
  source_id: string;
  account_id: string;
  account_arr: number;
  account_segment: Account['segment'];
  verbatim_snippet: string;
  event_date: string;
  severity: number;
}

interface AccountRollupRow {
  account_id: string;
  arr: number;
  segment: Account['segment'];
  n_mentions: number;
}

// Two ClickHouse queries (not one) because they serve different purposes: the
// evidence sample is capped + ranked by severity (what the card stack shows),
// while requesting_accounts must reflect EVERY account that mentioned the theme
// — capping that too would silently undercount "N accounts behind this theme".
// account_name isn't denormalized onto mentions; the ClickHouse CDC account
// replica supplies it without a production read-through to Postgres.
export const getThemeEvidence = async (input: GetThemeEvidenceInput): Promise<GetThemeEvidenceOutput> => {
  const limit = input.limit ?? 20;

  const [themeRow, evidenceRows, rollupRows] = await Promise.all([
    chQuery<{ name: string }>(
      `SELECT name FROM default.public_themes FINAL
       WHERE id = {theme_id:String} AND _peerdb_is_deleted = 0
       LIMIT 1`,
      { theme_id: input.theme_id },
    ),
    chQuery<MentionRow>(
      `SELECT source_type, source_id, account_id, account_arr, account_segment, verbatim_snippet, event_date, severity
       FROM mentions
       WHERE theme_id = {theme_id:String}
       ORDER BY severity DESC, extracted_at DESC
       LIMIT {limit:UInt32}`,
      { theme_id: input.theme_id, limit },
    ),
    chQuery<AccountRollupRow>(
      `SELECT account_id, any(account_arr) AS arr, any(account_segment) AS segment, count() AS n_mentions
       FROM mentions
       WHERE theme_id = {theme_id:String}
       GROUP BY account_id
       ORDER BY n_mentions DESC`,
      { theme_id: input.theme_id },
    ),
  ]);

  const theme = themeRow.data[0];
  if (!theme) throw new Error(`Theme "${input.theme_id}" not found`);

  const accountIds = [...new Set([...evidenceRows.data.map((r) => r.account_id), ...rollupRows.data.map((r) => r.account_id)])];
  const { data: nameRows } = accountIds.length
    ? await chQuery<{ id: string; name: string }>(
        `SELECT id, name FROM default.public_accounts FINAL
         WHERE _peerdb_is_deleted = 0 AND has({account_ids:Array(UUID)}, id)`,
        { account_ids: accountIds },
      )
    : { data: [] as { id: string; name: string }[] };
  const nameById = new Map(nameRows.map((r) => [r.id, r.name]));

  const evidence: EvidenceItem[] = evidenceRows.data.map((r) => ({
    source_type: r.source_type,
    source_id: r.source_id,
    account_name: nameById.get(r.account_id) ?? '(unknown account)',
    account_arr: r.account_arr,
    account_segment: r.account_segment,
    verbatim_snippet: r.verbatim_snippet,
    event_date: r.event_date,
    severity: r.severity,
  }));

  const requesting_accounts = rollupRows.data.map((r) => ({
    account_id: r.account_id,
    account_name: nameById.get(r.account_id) ?? '(unknown account)',
    arr: r.arr,
    segment: r.segment,
    n_mentions: r.n_mentions,
  }));

  return { theme_id: input.theme_id, theme_name: theme.name, evidence, requesting_accounts };
};
