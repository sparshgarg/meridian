'use client';

import type { CompareSignalsOutput } from '@/types/agent-tools';
import { ChartFrame } from './chart-frame';
import { sourceTypeColor, sourceTypeLabel } from './palette';

const sourceKeys = ['tickets', 'transcripts', 'deal_losses'] as const;

export const SourceMix = ({ data }: { data: CompareSignalsOutput }): JSX.Element => (
  <ChartFrame
    caption={`${data.total_mentions.toLocaleString()} signals · ClickHouse: mentions + accounts`}
    legend={sourceKeys.map((key) => ({ label: sourceTypeLabel[key], color: sourceTypeColor[key] }))}
  >
    <div className="space-y-4" role="list" aria-label="Signal source mix">
      {data.rows.map((row) => {
        const total = Math.max(row.mention_count, 1);
        return (
          <div key={row.theme_id} role="listitem">
            <div className="mb-1.5 flex justify-between gap-3 text-xs">
              <span className="font-semibold text-ink">{row.theme_name}</span>
              <span className="tabular-nums text-ink-muted">{row.mention_count} signals</span>
            </div>
            <div className="flex h-4 overflow-hidden rounded-full bg-line">
              {sourceKeys.map((key) => {
                const count = row.source_counts[key];
                return count > 0 ? (
                  <div
                    key={key}
                    style={{ width: `${(count / total) * 100}%`, backgroundColor: sourceTypeColor[key] }}
                    title={`${sourceTypeLabel[key]}: ${count}`}
                    aria-label={`${sourceTypeLabel[key]}: ${count}`}
                  />
                ) : null;
              })}
            </div>
          </div>
        );
      })}
    </div>
  </ChartFrame>
);
