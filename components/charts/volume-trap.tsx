'use client';

import {
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { VolumeTrapPoint } from '@/types/chapter';
import { ChartFrame, VizTooltip } from './chart-frame';
import { formatUsd } from './format';
import { ink, series, status } from './palette';

// Emphasis chart: two points carry the story (trap + gem), the rest are
// context-gray. Emphasized points are larger and direct-labeled — identity is
// never color-alone.
const pointColor = (p: VolumeTrapPoint): string => {
  if (p.emphasis === 'trap') return status.serious;
  if (p.emphasis === 'gem') return series.violet;
  return ink.deemphasis;
};

const pointLabel = (p: VolumeTrapPoint): string => {
  if (p.emphasis === 'trap') return 'Dunning emails — the trap';
  if (p.emphasis === 'gem') return 'Multi-entity — hidden gem';
  return '';
};

interface DotProps {
  cx?: number;
  cy?: number;
  payload?: VolumeTrapPoint;
}

// custom shape: recharts' Cell r / LabelList don't apply to Scatter marks
const EmphasisDot = (props: DotProps): JSX.Element => {
  const { cx = 0, cy = 0, payload } = props;
  if (!payload) return <g />;
  const emphasized = payload.emphasis !== null;
  const color = pointColor(payload);
  // trap sits at the right edge, so its label anchors to the left of the dot
  const anchorEnd = payload.emphasis === 'trap';
  return (
    <g>
      <circle cx={cx} cy={cy} r={emphasized ? 9 : 6} fill={color} stroke="#fcfcfb" strokeWidth={2} />
      {emphasized && (
        <text
          x={anchorEnd ? cx - 14 : cx + 14}
          y={cy + 4}
          textAnchor={anchorEnd ? 'end' : 'start'}
          fill={ink.primary}
          fontSize={11}
          fontWeight={600}
        >
          {pointLabel(payload)}
        </text>
      )}
    </g>
  );
};

export const VolumeTrap = ({ points }: { points: VolumeTrapPoint[] }): JSX.Element => (
  <ChartFrame
    caption="Each dot is a theme · loudness (mentions) vs the ARR actually asking for it"
    legend={[
      { label: 'Volume trap', color: status.serious },
      { label: 'Hidden gem', color: series.violet },
      { label: 'Other themes', color: ink.deemphasis },
    ]}
  >
    <ResponsiveContainer width="100%" height={320}>
      <ScatterChart margin={{ top: 20, right: 36, bottom: 8, left: 8 }}>
        <CartesianGrid stroke={ink.grid} strokeDasharray="0" vertical={false} />
        <XAxis
          type="number"
          dataKey="mention_count"
          name="Mentions"
          domain={[0, 'dataMax + 20']}
          tick={{ fill: ink.muted, fontSize: 11 }}
          axisLine={{ stroke: ink.baseline }}
          tickLine={false}
          label={{
            value: 'Total mentions (volume)',
            position: 'insideBottom',
            offset: -2,
            fill: ink.secondary,
            fontSize: 11,
          }}
        />
        <YAxis
          type="number"
          dataKey="weighted_arr"
          name="Requester ARR"
          domain={[0, 'dataMax + 500000']}
          tickFormatter={formatUsd}
          tick={{ fill: ink.muted, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={52}
        />
        <Tooltip
          cursor={{ strokeDasharray: '4 4', stroke: ink.baseline }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const p = payload[0].payload as VolumeTrapPoint;
            return (
              <VizTooltip
                title={p.theme_name}
                rows={[
                  { label: 'Mentions', value: p.mention_count.toLocaleString() },
                  { label: 'Requester ARR', value: formatUsd(p.weighted_arr) },
                  { label: 'Enterprise accounts', value: String(p.n_enterprise_accounts) },
                ]}
              />
            );
          }}
        />
        <Scatter data={points} shape={EmphasisDot} isAnimationActive animationDuration={700} />
      </ScatterChart>
    </ResponsiveContainer>
  </ChartFrame>
);
