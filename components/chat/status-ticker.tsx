'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Check, Loader2 } from 'lucide-react';
import type { StatusUpdate } from '@/types/chapter';

// Live feed of what the agent is doing (ClickHouse queries, joins, scoring) —
// makes the tool-call architecture visible, which is half the demo.
export const StatusTicker = ({ statuses }: { statuses: StatusUpdate[] }): JSX.Element => (
  <div className="space-y-1">
    <AnimatePresence initial={false}>
      {statuses.map((s) => (
        <motion.div
          key={s.id}
          initial={{ opacity: 0, height: 0, x: -8 }}
          animate={{ opacity: 1, height: 'auto', x: 0 }}
          exit={{ opacity: 0, height: 0 }}
          className="flex items-start gap-2 overflow-hidden text-xs"
        >
          {s.state === 'running' ? (
            <Loader2 className="mt-0.5 h-3 w-3 shrink-0 animate-spin text-accent" />
          ) : (
            <Check className="mt-0.5 h-3 w-3 shrink-0" style={{ color: '#006300' }} />
          )}
          <span className={s.state === 'running' ? 'text-ink-secondary' : 'text-ink-muted'}>
            {s.label}
            {s.detail && <span className="ml-1 text-ink-muted/80">· {s.detail}</span>}
          </span>
        </motion.div>
      ))}
    </AnimatePresence>
  </div>
);
