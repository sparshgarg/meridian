'use client';

import { DatabaseZap } from 'lucide-react';
import type { NoDataOutcome } from '@/types/chapter';

export const NoDataState = ({ outcome }: { outcome: NoDataOutcome }): JSX.Element => (
  <div className="rounded-2xl border border-line bg-card p-5" role="status">
    <div className="flex items-start gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-soft text-blue">
        <DatabaseZap className="h-4 w-4" aria-hidden="true" />
      </span>
      <div>
        <p className="font-display font-semibold text-ink">{outcome.title}</p>
        <p className="mt-1 text-sm leading-relaxed text-ink-secondary">{outcome.message}</p>
      </div>
    </div>
    {outcome.suggestions.length > 0 && (
      <div className="mt-4 border-t border-line pt-3">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-muted">Try instead</p>
        <ul className="mt-2 space-y-1 text-sm text-ink-secondary">
          {outcome.suggestions.map((suggestion) => <li key={suggestion}>“{suggestion}”</li>)}
        </ul>
      </div>
    )}
  </div>
);
