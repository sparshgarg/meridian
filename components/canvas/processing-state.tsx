'use client';

import { Database, Loader2, Workflow } from 'lucide-react';
import type { StatusUpdate } from '@/types/chapter';

export const ProcessingState = ({ statuses }: { statuses: StatusUpdate[] }): JSX.Element => {
  const active = [...statuses].reverse().find((status) => status.state === 'running');
  return (
    <div
      className="rounded-3xl border border-accent/20 bg-card-strong p-6 shadow-depth-8"
      role="status"
      aria-live="polite"
      aria-label="Meridian is processing your question"
    >
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent-soft text-accent">
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
        </span>
        <div>
          <p className="font-display font-semibold text-ink">
            {active?.label ?? 'Processing your question'}
          </p>
          <p className="mt-0.5 text-sm text-ink-muted">
            {active?.detail ?? 'Trigger.dev is preparing a ClickHouse analysis.'}
          </p>
        </div>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3 text-xs text-ink-secondary">
        <div className="shimmer flex h-12 items-center gap-2 rounded-xl px-3">
          <Workflow className="h-4 w-4 text-accent" aria-hidden="true" /> Trigger.dev agent
        </div>
        <div className="shimmer flex h-12 items-center gap-2 rounded-xl px-3">
          <Database className="h-4 w-4 text-blue" aria-hidden="true" /> ClickHouse analytics
        </div>
      </div>
    </div>
  );
};
