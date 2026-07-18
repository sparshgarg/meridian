'use client';

import { motion } from 'framer-motion';
import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { GetImpactProjectionOutput } from '@/types/agent-tools';
import { ChartFrame, VizTooltip } from './chart-frame';
import { formatUsd } from './format';
import { blueRamp, ink } from './palette';

const STEP_META = [
  { key: 'arr_at_risk', label: 'ARR at risk', color: blueRamp.s550 },
  { key: 'pipeline_unblocked', label: 'Pipeline unblocked', color: blueRamp.s450 },
  { key: 'expansion_potential', label: 'Expansion', color: blueRamp.s300 },
] as const;

const typeLabel = { risk: 'At risk', unblock: 'Unblocks', expansion: 'Expansion' } as const;

// Waterfall via the invisible-base-bar technique; ordinal one-hue ramp
// (magnitude job), total in the darkest step.
export const ImpactWaterfall = ({ data }: { data: GetImpactProjectionOutput }): JSX.Element => {
  let running = 0;
  interface WaterfallBar {
    name: string;
    base: number;
    value: number;
    color: string;
    isTotal: boolean;
  }
  const bars: WaterfallBar[] = STEP_META.map((s) => {
    const value = data[s.key];
    const row = { name: s.label, base: running, value, color: s.color, isTotal: false };
    running += value;
    return row;
  });
  bars.push({ name: 'Total impact', base: 0, value: data.total, color: blueRamp.s650, isTotal: true });

  return (
    <ChartFrame caption={`Estimated 12-month impact · confidence: ${data.confidence}`}>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={bars} margin={{ top: 24, right: 12, bottom: 0, left: 8 }} barCategoryGap="28%">
          <XAxis
            dataKey="name"
            tick={{ fill: ink.secondary, fontSize: 11 }}
            axisLine={{ stroke: ink.baseline }}
            tickLine={false}
          />
          <YAxis hide domain={[0, Math.ceil((data.total * 1.15) / 500_000) * 500_000]} />
          <Tooltip
            cursor={{ fill: 'rgba(11,11,11,0.03)' }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const p = payload.find((x) => x.dataKey === 'value')?.payload as
                | (typeof bars)[number]
                | undefined;
              if (!p) return null;
              return <VizTooltip title={p.name} rows={[{ label: 'Amount', value: formatUsd(p.value), color: p.color }]} />;
            }}
          />
          <Bar dataKey="base" stackId="w" fill="transparent" isAnimationActive={false} />
          <Bar dataKey="value" stackId="w" radius={[4, 4, 0, 0]} animationDuration={700}>
            {bars.map((b) => (
              <Cell key={b.name} fill={b.color} />
            ))}
            <LabelList
              dataKey="value"
              position="top"
              formatter={(v: number) => formatUsd(v)}
              style={{ fill: ink.primary, fontSize: 12, fontWeight: 600 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div className="mt-3 space-y-1 border-t border-line pt-3">
        {data.breakdown.map((b, i) => (
          <motion.div
            key={`${b.account_id}_${b.contribution_type}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 + i * 0.06 }}
            className="flex items-baseline gap-2 rounded-lg px-2 py-1 text-xs hover:bg-black/[0.03]"
          >
            <span className="w-16 shrink-0 rounded-full bg-black/[0.05] px-2 py-0.5 text-center text-[10px] font-semibold text-ink-secondary">
              {typeLabel[b.contribution_type]}
            </span>
            <span className="shrink-0 font-medium text-ink">{b.account_name}</span>
            <span className="truncate text-ink-muted" title={b.reason}>
              {b.reason}
            </span>
            <span className="ml-auto shrink-0 font-semibold tabular-nums text-ink">
              {formatUsd(b.contribution_usd)}
            </span>
          </motion.div>
        ))}
      </div>
    </ChartFrame>
  );
};
