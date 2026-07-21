'use client';

import { Building2, FileText, MessageSquareText, ReceiptText } from 'lucide-react';
import type { GetAccountSignalsOutput } from '@/types/agent-tools';

const usd = (value: number): string =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);

export const AccountSnapshot = ({ data }: { data: GetAccountSignalsOutput }): JSX.Element => (
  <div className="space-y-4">
    <div className="grid gap-3 sm:grid-cols-3">
      <div className="rounded-2xl bg-accent-soft p-4">
        <Building2 className="mb-2 h-4 w-4 text-accent" aria-hidden="true" />
        <p className="font-display text-xl font-semibold text-ink">{data.account.account_name}</p>
        <p className="text-xs text-ink-muted">
          {data.account.segment.replace('_', ' ')} · {data.account.industry}
        </p>
      </div>
      <div className="rounded-2xl border border-line bg-card p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Account ARR</p>
        <p className="mt-2 font-display text-2xl font-semibold text-ink">{usd(data.account.arr)}</p>
      </div>
      <div className="rounded-2xl border border-line bg-card p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Signals found</p>
        <p className="mt-2 font-display text-2xl font-semibold text-ink">{data.total_mentions}</p>
        <p className="text-xs text-ink-muted">{data.themes.length} themes</p>
      </div>
    </div>

    <div className="grid gap-3 md:grid-cols-2">
      <div className="rounded-2xl border border-line bg-white p-4">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-muted">
          Top requests
        </h3>
        <div className="space-y-3">
          {data.themes.slice(0, 4).map((theme) => (
            <div key={theme.theme_id} className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-ink">{theme.theme_name}</p>
                <p className="text-xs text-ink-muted">
                  {theme.source_counts.tickets} tickets · {theme.source_counts.transcripts} interviews
                </p>
              </div>
              <span className="rounded-lg bg-blue-soft px-2 py-1 text-xs font-semibold text-blue">
                {theme.mention_count} signals
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-line bg-white p-4">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-muted">
          Source evidence
        </h3>
        <div className="space-y-3">
          {data.evidence.slice(0, 3).map((item) => {
            const Icon =
              item.source_type === 'ticket'
                ? ReceiptText
                : item.source_type === 'transcript'
                  ? MessageSquareText
                  : FileText;
            return (
              <blockquote key={`${item.source_type}-${item.source_id}`} className="text-sm text-ink-secondary">
                <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                  {item.source_id}
                </div>
                “{item.verbatim_snippet}”
              </blockquote>
            );
          })}
        </div>
      </div>
    </div>
  </div>
);
