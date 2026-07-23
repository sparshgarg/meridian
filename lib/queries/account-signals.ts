import { query as chQuery } from '@/lib/db/clickhouse';
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

/** True for "Figma" / "Airtable"; false for "Who are my top customers…". */
export const looksLikeAccountNameQuery = (query: string): boolean => {
  const text = query.trim();
  if (!text || text.length > 48) return false;
  if (/[?]/.test(text)) return false;
  if (/\s{2,}/.test(text)) return false;
  if (
    /\b(who|what|which|how|why|where|top|biggest|largest|customers?|accounts?|want|prioritize|compare|theme|segment|enterprise|dunning|billing)\b/i.test(
      text,
    )
  ) {
    return false;
  }
  // Company-ish: 1–4 tokens, mostly letters/numbers/&-./
  const tokens = text.split(/\s+/);
  if (tokens.length > 4) return false;
  return /^[\p{L}\p{N}&.'’\-]+(?:\s+[\p{L}\p{N}&.'’\-]+)*$/u.test(text);
};

export const findAccounts = async (input: FindAccountsInput): Promise<FindAccountsOutput> => {
  const queryText = input.query.trim();
  if (!queryText) return { matches: [] };

  // Portfolio / natural-language questions must not hit name search.
  if (!looksLikeAccountNameQuery(queryText)) {
    return {
      matches: [],
      rejected_as_name_lookup: true,
      hint: 'This looks like a portfolio or analytical question, not a company name. Use list_top_accounts (ARR ranking + wants), list_opportunities_ranked, compare_signals, or aggregate_signals instead.',
    };
  }

  const limit = Math.min(Math.max(input.limit ?? 5, 1), 10);
  const { data } = await chQuery<AccountRow>(
    `SELECT id AS account_id, name AS account_name, industry, toFloat64(arr) AS arr, segment
     FROM default.public_accounts FINAL
     WHERE _peerdb_is_deleted = 0
       AND positionCaseInsensitiveUTF8(name, {query:String}) > 0
     ORDER BY if(lower(name) = lower({query:String}), 0, 1), arr DESC
     LIMIT {limit:UInt32}`,
    { query: queryText, limit },
  );
  return { matches: data };
};

export const getAccountSignals = async (
  input: GetAccountSignalsInput,
): Promise<GetAccountSignalsOutput | null> => {
  const { data: accountRows } = await chQuery<AccountRow>(
    `SELECT id AS account_id, name AS account_name, industry, toFloat64(arr) AS arr, segment
     FROM default.public_accounts FINAL
     WHERE id = {account_id:UUID} AND _peerdb_is_deleted = 0
     LIMIT 1`,
    { account_id: input.account_id },
  );
  const account = accountRows[0];
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
    chQuery<{ id: ThemeId; name: string }>(
      `SELECT id, name FROM default.public_themes FINAL
       WHERE _peerdb_is_deleted = 0`,
    ),
    chQuery<{
      deal_id: string;
      name: string;
      status: 'won' | 'lost' | 'in_progress';
      amount: number;
      blocking_theme_id: ThemeId | null;
      loss_reason: string | null;
    }>(
      `SELECT id AS deal_id, name, status, toFloat64(amount) AS amount,
              nullIf(blocking_theme_id, '') AS blocking_theme_id,
              nullIf(loss_reason, '') AS loss_reason
       FROM default.public_deals FINAL
       WHERE account_id = {account_id:UUID} AND _peerdb_is_deleted = 0
       ORDER BY created_at DESC`,
      { account_id: input.account_id },
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
