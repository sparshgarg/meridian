'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, Check, Database, Loader2, Workflow } from 'lucide-react';
import type { StatusUpdate } from '@/types/chapter';

// Live feed of what the agent is doing (ClickHouse queries, joins, scoring) —
// makes the tool-call architecture visible, which is half the demo.
const StatusRow = ({ status }: { status: StatusUpdate }): JSX.Element => (
  <motion.div
    key={status.id}
    initial={{ opacity: 0, height: 0, x: -8 }}
    animate={{ opacity: 1, height: 'auto', x: 0 }}
    exit={{ opacity: 0, height: 0 }}
    className="flex items-start gap-2 overflow-hidden py-0.5 text-xs"
  >
    {status.state === 'running' ? (
      <Loader2 className="mt-0.5 h-3 w-3 shrink-0 animate-spin text-accent" />
    ) : status.state === 'error' ? (
      <AlertCircle className="mt-0.5 h-3 w-3 shrink-0 text-coral" />
    ) : (
      <Check className="mt-0.5 h-3 w-3 shrink-0" style={{ color: '#006300' }} />
    )}
    <span className={status.state === 'running' ? 'text-ink-secondary' : 'text-ink-muted'}>
      <span className="flex flex-wrap items-center gap-1">
        {status.source && (
          <span className="inline-flex items-center gap-1 rounded-md bg-white px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ring-line">
            {status.source === 'clickhouse' ? <Database className="h-2.5 w-2.5" /> : <Workflow className="h-2.5 w-2.5" />}
            {status.source === 'clickhouse' ? 'ClickHouse' : status.source === 'trigger' ? 'Trigger.dev' : 'Agent'}
          </span>
        )}
        <span>{status.label}</span>
      </span>
      {status.detail && <span className="mt-0.5 block text-ink-muted/80">{status.detail}</span>}
    </span>
  </motion.div>
);

export const StatusTicker = ({ statuses }: { statuses: StatusUpdate[] }): JSX.Element => {
  const running = statuses.filter((status) => status.state === 'running');
  const completed = statuses.filter((status) => status.state !== 'running');
  return (
    <div className="space-y-1" aria-live="polite" aria-label="Live analysis activity">
      <AnimatePresence initial={false}>
        {running.map((status) => <StatusRow key={status.id} status={status} />)}
      </AnimatePresence>
      {completed.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer list-none text-[11px] font-medium text-ink-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
            {completed.length} completed step{completed.length === 1 ? '' : 's'} · inspect activity
          </summary>
          <div className="mt-1 border-l border-line pl-2">
            {completed.map((status) => <StatusRow key={status.id} status={status} />)}
          </div>
        </details>
      )}
    </div>
  );
};
