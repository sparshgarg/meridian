'use client';

import { motion } from 'framer-motion';
import { Eye, Gem, MoveDown, Rocket } from 'lucide-react';
import type { ListOpportunitiesOutput, OpportunityRow } from '@/types/agent-tools';
import { ChartFrame } from './chart-frame';
import { formatUsd } from './format';
import { blueRamp, ink, sourceTypeColor, sourceTypeLabel } from './palette';

const recBadge: Record<OpportunityRow['recommendation'], { label: string; icon: typeof Rocket; className: string }> = {
  build_now: { label: 'Build now', icon: Rocket, className: 'bg-accent text-white' },
  build_next: { label: 'Build next', icon: Gem, className: 'bg-accent-soft text-accent' },
  watch: { label: 'Watch', icon: Eye, className: 'bg-amber-soft text-[#8a5d00]' },
  deprioritize: { label: 'Deprioritize', icon: MoveDown, className: 'bg-black/[0.05] text-ink-muted' },
};

// Signal strength is magnitude → one-hue ordinal ramp, darker = stronger.
const rampFor = (signal: number): string => {
  if (signal >= 80) return blueRamp.s650;
  if (signal >= 60) return blueRamp.s500;
  if (signal >= 45) return blueRamp.s400;
  return blueRamp.s250;
};

const SOURCES = ['tickets', 'transcripts', 'deal_losses'] as const;

export const OpportunityRanking = ({ data }: { data: ListOpportunitiesOutput }): JSX.Element => {
  const visibleRows = data.opportunities.slice(0, 4);
  const maxMentions = Math.max(
    ...visibleRows.map((o) => SOURCES.reduce((acc, s) => acc + o.mention_counts[s], 0)),
  );

  return (
    <ChartFrame
      caption={`Signal strength, 0–100 · ${data.opportunities.length} themes · ${data.total_mentions_analyzed.toLocaleString()} mentions analyzed`}
      legend={SOURCES.map((s) => ({ label: sourceTypeLabel[s], color: sourceTypeColor[s] }))}
    >
      <div className="space-y-1.5">
        {visibleRows.map((row, i) => {
          const badge = recBadge[row.recommendation];
          const totalMentions = SOURCES.reduce((acc, s) => acc + row.mention_counts[s], 0);
          return (
            <motion.div
              key={row.theme_id}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06, type: 'spring', stiffness: 240, damping: 26 }}
              className="group grid grid-cols-[minmax(150px,1.1fr)_2fr_minmax(180px,1fr)] items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-black/[0.03]"
              title={row.reasoning}
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ink">{row.theme_name}</p>
                <span
                  className={`mt-0.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${badge.className}`}
                >
                  <badge.icon className="h-3 w-3" />
                  {badge.label}
                </span>
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <div className="h-4 flex-1 overflow-hidden rounded-md bg-black/[0.04]">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${row.signal_strength}%` }}
                      transition={{ delay: 0.2 + i * 0.06, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                      className="h-full rounded-md"
                      style={{ backgroundColor: rampFor(row.signal_strength) }}
                    />
                  </div>
                  <span className="w-7 text-right text-sm font-semibold tabular-nums text-ink">
                    {row.signal_strength}
                  </span>
                </div>
                {/* mention mix: stacked bar with 2px surface gaps between segments */}
                <div
                  className="mt-1.5 flex h-1.5 gap-[2px]"
                  style={{ width: `${(totalMentions / maxMentions) * 100}%` }}
                  aria-label={`${totalMentions} mentions`}
                >
                  {SOURCES.filter((s) => row.mention_counts[s] > 0).map((s) => (
                    <div
                      key={s}
                      className="rounded-sm"
                      style={{
                        backgroundColor: sourceTypeColor[s],
                        flexGrow: row.mention_counts[s],
                      }}
                    />
                  ))}
                </div>
              </div>

              <div className="text-right">
                <p className="text-sm font-semibold tabular-nums text-ink">
                  {formatUsd(row.total_arr_of_requesters)}
                  <span className="ml-1 text-xs font-normal text-ink-muted">requester ARR</span>
                </p>
                <p className="text-xs tabular-nums" style={{ color: ink.secondary }}>
                  {row.n_unique_accounts} accounts · {row.n_enterprise_accounts} enterprise
                </p>
              </div>
            </motion.div>
          );
        })}
        {data.opportunities.length > visibleRows.length && (
          <p className="px-2 pt-2 text-xs text-ink-muted">
            {data.opportunities.length - visibleRows.length} lower-signal themes omitted
          </p>
        )}
      </div>
    </ChartFrame>
  );
};
