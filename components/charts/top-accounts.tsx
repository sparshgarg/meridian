'use client';

import { Building2 } from 'lucide-react';
import type { ListTopAccountsOutput } from '@/types/agent-tools';
import { formatCount, formatUsd, segmentLabel } from './format';
import { ChartFrame } from './chart-frame';

export const TopAccounts = ({ data }: { data: ListTopAccountsOutput }): JSX.Element => {
  const maxArr = Math.max(...data.accounts.map((row) => row.arr), 1);
  return (
    <ChartFrame
      caption={`Top ${data.filters.limit} by ARR · ClickHouse accounts + mentions`}
    >
      <div className="space-y-3">
        {data.accounts.map((account) => (
          <div
            key={account.account_id}
            className="rounded-2xl border border-line bg-white p-4 shadow-depth-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-accent-soft font-display text-sm font-semibold text-accent">
                  {account.rank}
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-3.5 w-3.5 shrink-0 text-ink-muted" aria-hidden="true" />
                    <p className="truncate font-display text-base font-semibold text-ink">
                      {account.account_name}
                    </p>
                  </div>
                  <p className="mt-0.5 text-xs text-ink-muted">
                    {segmentLabel[account.segment]} · {account.industry} ·{' '}
                    {formatCount(account.total_mentions)} signals
                  </p>
                </div>
              </div>
              <p className="shrink-0 font-display text-lg font-semibold tabular-nums text-ink">
                {formatUsd(account.arr)}
              </p>
            </div>

            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-line">
              <div
                className="h-full rounded-full bg-accent"
                style={{ width: `${Math.max(6, (account.arr / maxArr) * 100)}%` }}
              />
            </div>

            <div className="mt-3">
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
                What they want
              </p>
              {account.top_themes.length === 0 ? (
                <p className="text-xs text-ink-muted">No extracted themes yet for this account.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {account.top_themes.map((theme) => (
                    <span
                      key={theme.theme_id}
                      className="rounded-lg bg-blue-soft px-2 py-1 text-xs font-medium text-blue"
                    >
                      {theme.theme_name}
                      <span className="ml-1 tabular-nums text-blue/70">
                        · {theme.mention_count}
                      </span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </ChartFrame>
  );
};
