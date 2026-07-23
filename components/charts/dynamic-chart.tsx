'use client';

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts';
import type { DynamicChartSpec } from '@/types/dynamic-chart';
import { ChartFrame, VizTooltip } from './chart-frame';
import { blueRamp, ink, series as palette } from './palette';

const CATEGORICAL = [
  palette.blue,
  palette.green,
  palette.magenta,
  palette.yellow,
  palette.aqua,
  palette.orange,
  palette.violet,
  palette.red,
] as const;

const RAMP = [
  blueRamp.s300,
  blueRamp.s350,
  blueRamp.s400,
  blueRamp.s450,
  blueRamp.s500,
  blueRamp.s550,
] as const;

const formatValue = (value: string | number | null | undefined): string => {
  if (value == null) return '—';
  if (typeof value === 'number') {
    if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
    if (Math.abs(value) >= 1_000) return `${Math.round(value / 1_000)}K`;
    return Number.isInteger(value) ? String(value) : value.toFixed(1);
  }
  return String(value);
};

const seriesColor = (index: number): string => CATEGORICAL[index % CATEGORICAL.length];

const captionFor = (spec: DynamicChartSpec): string => {
  const tables = spec.provenance.tables.join(' + ');
  const why = spec.why ? ` · ${spec.why}` : '';
  return spec.caption ?? `${spec.provenance.source}: ${tables}${why}`;
};

const toNumeric = (row: Record<string, string | number | null>, field: string): number => {
  const value = row[field];
  return typeof value === 'number' ? value : Number(value) || 0;
};

const KpiBlock = ({ spec }: { spec: DynamicChartSpec }): JSX.Element => (
  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" role="list" aria-label={spec.title}>
    {spec.data.slice(0, 6).map((row, index) => {
      const label = String(row[spec.encoding.x.field] ?? row.label ?? `Metric ${index + 1}`);
      const value = row[spec.encoding.y.field];
      return (
        <div
          key={`${label}-${index}`}
          role="listitem"
          className="rounded-2xl border border-line bg-surface px-4 py-3 shadow-depth-4"
        >
          <div className="text-xs font-medium uppercase tracking-wide text-ink-muted">{label}</div>
          <div className="mt-1 font-display text-2xl tabular-nums text-ink">{formatValue(value)}</div>
        </div>
      );
    })}
  </div>
);

const TableBlock = ({ spec }: { spec: DynamicChartSpec }): JSX.Element => {
  const fields = [
    spec.encoding.x.field,
    spec.encoding.y.field,
    ...(spec.series_fields ?? []),
    ...(spec.encoding.color ? [spec.encoding.color.field] : []),
  ].filter((field, index, all) => all.indexOf(field) === index);

  return (
    <div className="overflow-x-auto" role="table" aria-label={spec.title}>
      <table className="w-full min-w-[420px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-line text-xs uppercase tracking-wide text-ink-muted">
            {fields.map((field) => (
              <th key={field} className="px-2 py-2 font-medium">
                {spec.series_labels?.[field] ??
                  (field === spec.encoding.x.field
                    ? spec.encoding.x.title ?? field
                    : field === spec.encoding.y.field
                      ? spec.encoding.y.title ?? field
                      : field)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {spec.data.map((row, index) => (
            <tr key={index} className="border-b border-line/70">
              {fields.map((field) => (
                <td key={field} className="px-2 py-2 tabular-nums text-ink">
                  {formatValue(row[field])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const CartesianBlock = ({ spec }: { spec: DynamicChartSpec }): JSX.Element => {
  const xKey = spec.encoding.x.field;
  const yKey = spec.encoding.y.field;
  const seriesFields =
    spec.series_fields && spec.series_fields.length > 0 ? spec.series_fields : [yKey];
  const horizontal = spec.mark === 'horizontal_bar';
  const stacked = spec.mark === 'stacked_bar';
  const grouped = spec.mark === 'grouped_bar';

  if (spec.mark === 'scatter') {
    return (
      <ResponsiveContainer width="100%" height={280}>
        <ScatterChart margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
          <CartesianGrid stroke={ink.grid} />
          <XAxis
            type="number"
            dataKey={xKey}
            name={spec.encoding.x.title ?? xKey}
            tick={{ fill: ink.muted, fontSize: 11 }}
            axisLine={{ stroke: ink.baseline }}
            tickLine={false}
          />
          <YAxis
            type="number"
            dataKey={yKey}
            name={spec.encoding.y.title ?? yKey}
            tick={{ fill: ink.muted, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={40}
          />
          {spec.encoding.size ? (
            <ZAxis type="number" dataKey={spec.encoding.size.field} range={[40, 280]} />
          ) : null}
          <Tooltip
            cursor={{ strokeDasharray: '4 4' }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const row = payload[0]?.payload as Record<string, string | number | null>;
              return (
                <VizTooltip
                  title={String(row.label ?? row[xKey] ?? '')}
                  rows={[
                    { label: spec.encoding.x.title ?? xKey, value: formatValue(row[xKey]) },
                    { label: spec.encoding.y.title ?? yKey, value: formatValue(row[yKey]) },
                  ]}
                />
              );
            }}
          />
          <Scatter data={spec.data} fill={blueRamp.s450}>
            {spec.data.map((_, index) => (
              <Cell key={index} fill={seriesColor(index)} />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    );
  }

  if (spec.mark === 'line' || spec.mark === 'area') {
    const Chart = spec.mark === 'area' ? AreaChart : LineChart;
    return (
      <ResponsiveContainer width="100%" height={280}>
        <Chart data={spec.data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid stroke={ink.grid} vertical={false} />
          <XAxis
            dataKey={xKey}
            tick={{ fill: ink.muted, fontSize: 11 }}
            axisLine={{ stroke: ink.baseline }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: ink.muted, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={36}
            allowDecimals={false}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              return (
                <VizTooltip
                  title={String(label)}
                  rows={payload.map((entry, index) => ({
                    label: spec.series_labels?.[String(entry.dataKey)] ?? String(entry.dataKey),
                    value: formatValue(entry.value as number),
                    color: seriesColor(index),
                  }))}
                />
              );
            }}
          />
          {seriesFields.map((field, index) =>
            spec.mark === 'area' ? (
              <Area
                key={field}
                type="monotone"
                dataKey={field}
                stroke={seriesColor(index)}
                fill={seriesColor(index)}
                fillOpacity={0.18}
                strokeWidth={2}
                dot={false}
              />
            ) : (
              <Line
                key={field}
                type="monotone"
                dataKey={field}
                stroke={seriesColor(index)}
                strokeWidth={2}
                dot={false}
              />
            ),
          )}
        </Chart>
      </ResponsiveContainer>
    );
  }

  // bar / grouped / stacked / horizontal
  return (
    <ResponsiveContainer width="100%" height={Math.max(240, horizontal ? spec.data.length * 36 : 280)}>
      <BarChart
        data={spec.data}
        layout={horizontal ? 'vertical' : 'horizontal'}
        margin={{ top: 8, right: 16, bottom: 0, left: horizontal ? 8 : 0 }}
      >
        <CartesianGrid stroke={ink.grid} horizontal={!horizontal} vertical={horizontal} />
        {horizontal ? (
          <>
            <XAxis type="number" tick={{ fill: ink.muted, fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis
              type="category"
              dataKey={xKey}
              width={110}
              tick={{ fill: ink.muted, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
          </>
        ) : (
          <>
            <XAxis
              dataKey={xKey}
              tick={{ fill: ink.muted, fontSize: 11 }}
              axisLine={{ stroke: ink.baseline }}
              tickLine={false}
              interval={0}
              angle={spec.data.length > 6 ? -25 : 0}
              textAnchor={spec.data.length > 6 ? 'end' : 'middle'}
              height={spec.data.length > 6 ? 56 : 30}
            />
            <YAxis
              tick={{ fill: ink.muted, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={36}
              allowDecimals={false}
            />
          </>
        )}
        <Tooltip
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null;
            return (
              <VizTooltip
                title={String(label)}
                rows={payload.map((entry, index) => ({
                  label: spec.series_labels?.[String(entry.dataKey)] ?? String(entry.dataKey),
                  value: formatValue(entry.value as number),
                  color: seriesColor(index),
                }))}
              />
            );
          }}
        />
        {seriesFields.map((field, index) => (
          <Bar
            key={field}
            dataKey={field}
            stackId={stacked ? 'stack' : undefined}
            fill={seriesColor(index)}
            radius={stacked || grouped ? [2, 2, 0, 0] : [6, 6, 0, 0]}
            maxBarSize={grouped ? 28 : 42}
          >
            {!stacked && !grouped && seriesFields.length === 1
              ? spec.data.map((row, cellIndex) => (
                  <Cell
                    key={`${toNumeric(row, field)}-${cellIndex}`}
                    fill={RAMP[Math.min(cellIndex, RAMP.length - 1)]}
                  />
                ))
              : null}
          </Bar>
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
};

export const DynamicChart = ({ data }: { data: DynamicChartSpec }): JSX.Element => {
  const legend =
    data.series_fields && data.series_fields.length > 1
      ? data.series_fields.map((field, index) => ({
          label: data.series_labels?.[field] ?? field,
          color: seriesColor(index),
        }))
      : undefined;

  return (
    <ChartFrame caption={captionFor(data)} legend={legend}>
      {data.mark === 'kpi' ? (
        <KpiBlock spec={data} />
      ) : data.mark === 'table' ? (
        <TableBlock spec={data} />
      ) : (
        <CartesianBlock spec={data} />
      )}
    </ChartFrame>
  );
};
