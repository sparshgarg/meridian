import type { StreamEvent } from '@/types/chapter';
import { listTopAccounts } from '@/lib/queries/top-accounts';
import { usdCompact } from './stream-helpers';

/** Deterministic portfolio answer — never depends on the LLM inventing tool gaps. */
export async function* runTopAccountsFlow(messageId: string): AsyncGenerator<StreamEvent> {
  const label = 'Querying ClickHouse: top accounts by ARR + wants';
  yield {
    type: 'status',
    status: {
      id: `${messageId}_top_accounts`,
      label,
      state: 'running',
      source: 'clickhouse',
      phase: 'querying',
    },
  };

  const started = Date.now();
  const data = await listTopAccounts({ limit: 5, themes_per_account: 3 });
  yield {
    type: 'status',
    status: {
      id: `${messageId}_top_accounts`,
      label,
      detail: `${data.accounts.length} accounts · ${data.provenance.tables.join(' + ')} · ${Date.now() - started}ms`,
      state: 'done',
      source: 'clickhouse',
      phase: 'querying',
    },
  };

  if (data.accounts.length === 0) {
    const emptyId = `${messageId}_empty`;
    yield { type: 'chapter_start', chapter_id: emptyId, title: 'No matching accounts', icon: 'summary' };
    yield {
      type: 'chapter_visual',
      chapter_id: emptyId,
      visual: {
        type: 'no_data',
        data: {
          reason: 'known_no_evidence',
          title: 'No matching accounts',
          message: 'I couldn’t find accounts to rank by ARR in ClickHouse.',
          suggestions: [
            'What should we prioritize next quarter?',
            'What does Figma want?',
          ],
        },
      },
    };
    yield {
      type: 'message_end',
      message_id: messageId,
      headline: 'No accounts available to rank by ARR.',
      suggested_followups: [
        'What should we prioritize next quarter?',
        'What does Figma want?',
        'Which themes are growing fastest over the last 90 days?',
      ],
    };
    return;
  }

  const chapterId = `${messageId}_top_accounts_chapter`;
  yield {
    type: 'chapter_start',
    chapter_id: chapterId,
    title: 'Top customers by ARR',
    icon: 'ranking',
  };
  yield {
    type: 'chapter_visual',
    chapter_id: chapterId,
    visual: { type: 'top_accounts', data },
  };

  const names = data.accounts.map((row) => row.account_name);
  const top = data.accounts[0];
  const headline = `Your top customers by ARR are ${names.join(', ')} — led by ${top.account_name} at ${usdCompact(top.arr)}.`;

  yield {
    type: 'message_end',
    message_id: messageId,
    headline,
    suggested_followups: [
      `What does ${top.account_name} want?`,
      'What should we prioritize next quarter?',
      'Which themes are growing fastest over the last 90 days?',
      'Compare usage-based billing with dunning for enterprise accounts',
      'Who are my top enterprise customers?',
    ],
  };
}
