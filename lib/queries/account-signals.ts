import { query as chQuery } from '@/lib/db/clickhouse';
import { query as pgQuery, queryOne } from '@/lib/db/postgres';
import type {
  AccountSearchResult,
  EvidenceItem,
  FindAccountsInput,
  FindAccountsOutput,
  GetAccountSignalsInput,
  GetAccountSignalsOutput,
} from '@/types/agent-tools';
import type { ThemeId } from '@/types/theme';

interface AccountRow {
  account_id: string;
  account_name: string;
  industry: string;
  arr: number;
  segment: AccountSearchResult['segment'];
}

interface SignalRow {
  theme_id: ThemeId;
  mention_count: number;
  avg_severity: number;
  latest_signal_date: string;
  tickets: number;
  transcripts: number;
  deal_losses: number;
}

interface EvidenceRow {
  theme_id: ThemeId;
  source_type: EvidenceItem['source_type'];
  source_id: string;
  verbatim_snippet: string;
  event_date: string;
  severity: number;
}

export const findAccounts = async (input: FindAccountsInput): Promise<FindAccountsOutput> => {
  const queryText = input.query.trim();
  if (!queryText) return { matches: [] };
  const limit = Math.min(Math.max(input.limit ?? 5, 1), 10);
  const { data } = await pgQuery<AccountRow>(
    `SELECT id AS account_id, name AS account_name, industry, arr, segment
     FROM accounts
     WHERE name ILIKE $1
     ORDER BY CASE WHEN lower(name) = lower($2) THEN 0 ELSE 1 END, arr DESC
     LIMIT $3`,
    [`%${queryText}%`, queryText, limit],
  );
  return { matches: data };
};

export const getAccountSignals = async (
  input: GetAccountSignalsInput,
): Promise<GetAccountSignalsOutput | null> => {
  const account = await queryOne<AccountRow>(
    `SELECT id AS account_id, name AS account_name, industry, arr, segment
     FROM accounts WHERE id = $1`,
    [input.account_id],
  );
  if (!account) return null;

  const evidenceLimit = Math.min(Math.max(input.evidence_limit ?? 8, 1), 20);
  const [signals, evidenceRows, themeRows, deals] = await Promise.all([
    chQuery<SignalRow>(
      `SELECT theme_id, count() AS mention_count, round(avg(severity), 1) AS avg_severity,
              max(event_date) AS latest_signal_date,
              countIf(source_type = 'ticket') AS tickets,
              countIf(source_type = 'transcript') AS transcripts,
              countIf(source_type = 'deal_loss') AS deal_losses
       FROM mentions
       WHERE account_id = {account_id:UUID}
       GROUP BY theme_id
       ORDER BY mention_count DESC, avg_severity DESC`,
      { account_id: input.account_id },
    ),
    chQuery<EvidenceRow>(
      `SELECT theme_id, source_type, source_id, verbatim_snippet, event_date, severity
       FROM mentions
       WHERE account_id = {account_id:UUID}
       ORDER BY severity DESC, event_date DESC
       LIMIT {limit:UInt32}`,
      { account_id: input.account_id, limit: evidenceLimit },
    ),
    pgQuery<{ id: ThemeId; name: string }>('SELECT id, name FROM themes'),
    pgQuery<{
      deal_id: string;
      name: string;
      status: 'won' | 'lost' | 'in_progress';
      amount: number;
      blocking_theme_id: ThemeId | null;
      loss_reason: string | null;
    }>(
      `SELECT id AS deal_id, name, status, amount, blocking_theme_id, loss_reason
       FROM deals WHERE account_id = $1 ORDER BY created_at DESC`,
      [input.account_id],
    ),
  ]);

  const themeName = new Map(themeRows.data.map((theme) => [theme.id, theme.name]));
  const evidence: EvidenceItem[] = evidenceRows.data.map((row) => ({
    source_type: row.source_type,
    source_id: row.source_id,
    account_name: account.account_name,
    account_arr: account.arr,
    account_segment: account.segment,
    verbatim_snippet: row.verbatim_snippet,
    event_date: row.event_date,
    severity: row.severity,
  }));

  return {
    account,
    themes: signals.data.map((row) => ({
      theme_id: row.theme_id,
      theme_name: themeName.get(row.theme_id) ?? row.theme_id,
      mention_count: row.mention_count,
      avg_severity: row.avg_severity,
      latest_signal_date: row.latest_signal_date,
      source_counts: {
        tickets: row.tickets,
        transcripts: row.transcripts,
        deal_losses: row.deal_losses,
      },
    })),
    evidence,
    deals: deals.data.map((deal) => ({
      deal_id: deal.deal_id,
      name: deal.name,
      status: deal.status,
      amount: deal.amount,
      blocking_theme_id: deal.blocking_theme_id ?? undefined,
      loss_reason: deal.loss_reason ?? undefined,
    })),
    total_mentions: signals.data.reduce((sum, row) => sum + row.mention_count, 0),
  };
};
