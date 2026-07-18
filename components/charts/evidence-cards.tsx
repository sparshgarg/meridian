'use client';

import { motion } from 'framer-motion';
import { FileText, Mic, TrendingDown } from 'lucide-react';
import type { EvidenceItem, GetThemeEvidenceOutput } from '@/types/agent-tools';
import { ChartFrame } from './chart-frame';
import { formatUsd, segmentLabel } from './format';
import { sourceTypeColor } from './palette';

const sourceMeta: Record<EvidenceItem['source_type'], { label: string; icon: typeof FileText; color: string }> = {
  ticket: { label: 'Support ticket', icon: FileText, color: sourceTypeColor.tickets },
  transcript: { label: 'Interview', icon: Mic, color: sourceTypeColor.transcripts },
  deal_loss: { label: 'Deal loss', icon: TrendingDown, color: sourceTypeColor.deal_losses },
};

const SeverityDots = ({ severity }: { severity: number }): JSX.Element => (
  <span className="flex items-center gap-0.5" aria-label={`severity ${severity} of 5`}>
    {[1, 2, 3, 4, 5].map((i) => (
      <span
        key={i}
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: i <= severity ? '#52514e' : '#e1e0d9' }}
      />
    ))}
  </span>
);

// Provenance is the product: verbatim quotes with source IDs — the drill-down
// that proves no number is hallucinated.
export const EvidenceCards = ({ data }: { data: GetThemeEvidenceOutput }): JSX.Element => (
  <ChartFrame caption={`Verbatim evidence for “${data.theme_name}” · sorted by severity`}>
    <div className="grid gap-3 md:grid-cols-2">
      {data.evidence.map((item, i) => {
        const meta = sourceMeta[item.source_type];
        return (
          <motion.blockquote
            key={item.source_id}
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: i * 0.08, type: 'spring', stiffness: 220, damping: 24 }}
            className="flex flex-col rounded-2xl border border-line bg-white p-4 shadow-depth-4 transition-shadow hover:shadow-depth-8"
          >
            <div className="mb-2 flex items-center gap-2">
              <span
                className="flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold text-white"
                style={{ backgroundColor: meta.color }}
              >
                <meta.icon className="h-3 w-3" />
                {meta.label}
              </span>
              <code className="text-[11px] text-ink-muted">{item.source_id}</code>
              <span className="ml-auto text-[11px] tabular-nums text-ink-muted">{item.event_date}</span>
            </div>
            <p className="flex-1 text-sm leading-relaxed text-ink">“{item.verbatim_snippet}”</p>
            <div className="mt-3 flex items-center gap-2 border-t border-line pt-2.5 text-xs">
              <span className="font-semibold text-ink">{item.account_name}</span>
              <span className="rounded-full bg-black/[0.05] px-1.5 py-0.5 text-[10px] font-medium text-ink-secondary">
                {segmentLabel[item.account_segment]}
              </span>
              {item.account_arr > 0 && (
                <span className="tabular-nums text-ink-muted">{formatUsd(item.account_arr)} ARR</span>
              )}
              <span className="ml-auto">
                <SeverityDots severity={item.severity} />
              </span>
            </div>
          </motion.blockquote>
        );
      })}
    </div>

    {data.requesting_accounts.length > 0 && (
      <div className="mt-4 border-t border-line pt-3">
        <p className="mb-2 text-xs font-medium text-ink-muted">Accounts behind this theme</p>
        <div className="flex flex-wrap gap-2">
          {data.requesting_accounts.map((a) => (
            <span
              key={a.account_id}
              className="flex items-center gap-1.5 rounded-full border border-line bg-card px-2.5 py-1 text-xs"
            >
              <span className="font-medium text-ink">{a.account_name}</span>
              <span className="tabular-nums text-ink-muted">{formatUsd(a.arr)}</span>
              <span className="rounded-full bg-accent-soft px-1.5 text-[10px] font-semibold tabular-nums text-accent">
                ×{a.n_mentions}
              </span>
            </span>
          ))}
        </div>
      </div>
    )}
  </ChartFrame>
);
