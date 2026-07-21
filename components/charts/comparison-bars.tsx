'use client';

import type { CompareSignalsOutput } from '@/types/agent-tools';
import { formatUsd } from './format';
import { blueRamp } from './palette';
import { ChartFrame } from './chart-frame';

export const ComparisonBars = ({ data }: { data: CompareSignalsOutput }): JSX.Element => {
  const max = Math.max(...data.rows.map((row) => row.mention_count), 1);
  return (
    <ChartFrame caption={`${data.total_mentions.toLocaleString()} signals · ${data.provenance.source}: ${data.provenance.tables.join(' + ')}`}>
      <div className="space-y-4" role="list" aria-label="Theme signal comparison">
        {data.rows.map((row) => (
          <div key={row.theme_id} role="listitem">
            <div className="mb-1.5 flex items-baseline justify-between gap-3 text-xs">
              <span className="font-semibold text-ink">{row.theme_name}</span>
              <span className="shrink-0 tabular-nums text-ink-muted">
                {row.mention_count} signals · {formatUsd(row.requester_arr)} ARR
              </span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-line">
              <div
                className="h-full rounded-full"
                style={{ width: `${Math.max((row.mention_count / max) * 100, 2)}%`, backgroundColor: blueRamp.s450 }}
                aria-label={`${row.theme_name}: ${row.mention_count} signals`}
              />
            </div>
          </div>
        ))}
      </div>
    </ChartFrame>
  );
};
