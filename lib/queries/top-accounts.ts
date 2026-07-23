import { query as chQuery } from '@/lib/db/clickhouse';
import type {
  ListTopAccountsInput,
  ListTopAccountsOutput,
  TopAccountRow,
} from '@/types/agent-tools';
import type { ThemeId } from '@/types/theme';

interface AccountRow {
  account_id: string;
  account_name: string;
  industry: string;
  arr: number;
  segment: TopAccountRow['segment'];
}

interface ThemeCountRow {
  account_id: string;
  theme_id: ThemeId;
  theme_name: string;
  mention_count: number;
}

/**
 * Portfolio ranking: top customers by ARR from ClickHouse CDC accounts,
 * plus each account’s top themes from `mentions` (what they want).
 */
export const listTopAccounts = async (
  input: ListTopAccountsInput = {},
): Promise<ListTopAccountsOutput> => {
  const limit = Math.min(Math.max(input.limit ?? 5, 1), 15);
  const segment = input.segment ?? 'all';
  const themesPerAccount = Math.min(Math.max(input.themes_per_account ?? 3, 1), 5);

  const { data: accounts } = await chQuery<AccountRow>(
    `SELECT id AS account_id, name AS account_name, industry,
            toFloat64(arr) AS arr, segment
     FROM default.public_accounts FINAL
     WHERE _peerdb_is_deleted = 0
       AND ({segment:String} = 'all' OR segment = {segment:String})
     ORDER BY arr DESC
     LIMIT {limit:UInt32}`,
    { limit, segment },
  );

  if (accounts.length === 0) {
    return {
      accounts: [],
      filters: { limit, segment, themes_per_account: themesPerAccount },
      provenance: {
        source: 'ClickHouse',
        tables: ['default.public_accounts', 'mentions', 'default.public_themes'],
      },
    };
  }

  const accountIds = accounts.map((row) => row.account_id);
  const { data: themeRows } = await chQuery<ThemeCountRow>(
    `SELECT
        m.account_id AS account_id,
        m.theme_id AS theme_id,
        any(t.name) AS theme_name,
        count() AS mention_count
     FROM mentions AS m
     INNER JOIN default.public_themes AS t FINAL
       ON t.id = m.theme_id AND t._peerdb_is_deleted = 0
     WHERE m.account_id IN {account_ids:Array(UUID)}
     GROUP BY m.account_id, m.theme_id
     ORDER BY m.account_id, mention_count DESC`,
    { account_ids: accountIds },
  );

  const themesByAccount = new Map<string, TopAccountRow['top_themes']>();
  for (const row of themeRows) {
    const existing = themesByAccount.get(row.account_id) ?? [];
    if (existing.length >= themesPerAccount) continue;
    existing.push({
      theme_id: row.theme_id,
      theme_name: row.theme_name,
      mention_count: Number(row.mention_count),
    });
    themesByAccount.set(row.account_id, existing);
  }

  const mentionTotals = new Map<string, number>();
  for (const row of themeRows) {
    mentionTotals.set(
      row.account_id,
      (mentionTotals.get(row.account_id) ?? 0) + Number(row.mention_count),
    );
  }

  return {
    accounts: accounts.map((account, index) => ({
      rank: index + 1,
      account_id: account.account_id,
      account_name: account.account_name,
      industry: account.industry,
      arr: account.arr,
      segment: account.segment,
      total_mentions: mentionTotals.get(account.account_id) ?? 0,
      top_themes: themesByAccount.get(account.account_id) ?? [],
    })),
    filters: { limit, segment, themes_per_account: themesPerAccount },
    provenance: {
      source: 'ClickHouse',
      tables: ['default.public_accounts', 'mentions', 'default.public_themes'],
    },
  };
};
