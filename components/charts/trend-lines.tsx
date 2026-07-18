'use client';

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { TrendSeries } from '@/types/chapter';
import { ChartFrame, VizTooltip } from './chart-frame';
import { ink, series as palette } from './palette';

// Emphasis chart: emphasized series take categorical slots in fixed order;
// context series stay in de-emphasis gray. 2px lines, no dot clutter.
const EMPHASIS_SLOTS = [palette.blue, palette.green, palette.magenta, palette.yellow];

const monthTick = (iso: string): string =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short' });

export const TrendLines = ({ series }: { series: TrendSeries[] }): JSX.Element => {
  let slot = 0;
  const colored = series.map((s) => ({
    ...s,
    color: s.emphasized ? EMPHASIS_SLOTS[slot++ % EMPHASIS_SLOTS.length] : ink.deemphasis,
  }));

  // pivot to recharts row shape: one row per date, one column per theme
  const rows = colored[0].points.map((p, i) => {
    const row: Record<string, string | number> = { date: p.date };
    for (const s of colored) row[s.theme_id] = s.points[i]?.mentions ?? 0;
    return row;
  });

  return (
    <ChartFrame
      caption="Weekly mentions per theme · last 6 months"
      legend={colored.map((s) => ({ label: s.theme_name, color: s.color }))}
    >
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={rows} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid stroke={ink.grid} vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={monthTick}
            tick={{ fill: ink.muted, fontSize: 11 }}
            axisLine={{ stroke: ink.baseline }}
            tickLine={false}
            interval={3}
          />
          <YAxis
            tick={{ fill: ink.muted, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={28}
            allowDecimals={false}
          />
          <Tooltip
            cursor={{ stroke: ink.baseline, strokeDasharray: '4 4' }}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              return (
                <VizTooltip
                  title={new Date(String(label)).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  rows={[...payload]
                    .sort((a, b) => Number(b.value) - Number(a.value))
                    .map((p) => {
                      const s = colored.find((c) => c.theme_id === p.dataKey);
                      return {
                        label: s?.theme_name ?? String(p.dataKey),
                        value: String(p.value),
                        color: s?.color,
                      };
                    })}
                />
              );
            }}
          />
          {/* context series first so emphasized lines draw on top */}
          {[...colored].sort((a, b) => Number(a.emphasized) - Number(b.emphasized)).map((s) => (
            <Line
              key={s.theme_id}
              type="monotone"
              dataKey={s.theme_id}
              stroke={s.color}
              strokeWidth={s.emphasized ? 2.5 : 1.5}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 2, stroke: '#fcfcfb' }}
              animationDuration={900}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
};
