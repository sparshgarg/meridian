'use client';

import type { ReactNode } from 'react';

interface LegendItem {
  label: string;
  color: string;
}

interface ChartFrameProps {
  caption?: string;
  legend?: LegendItem[];
  children: ReactNode;
}

// Shared chart chrome: caption row + legend swatches on the card surface the
// palette was validated against.
export const ChartFrame = ({ caption, legend, children }: ChartFrameProps): JSX.Element => (
  <div className="rounded-2xl bg-card p-4 ring-1 ring-black/[0.06]">
    {(caption ?? legend) && (
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        {caption ? <p className="text-xs font-medium text-ink-muted">{caption}</p> : <span />}
        {legend && (
          <div className="flex flex-wrap items-center gap-3">
            {legend.map((item) => (
              <span key={item.label} className="flex items-center gap-1.5 text-xs text-ink-secondary">
                <span
                  className="h-2.5 w-2.5 rounded-[3px]"
                  style={{ backgroundColor: item.color }}
                />
                {item.label}
              </span>
            ))}
          </div>
        )}
      </div>
    )}
    {children}
  </div>
);

interface VizTooltipProps {
  title: string;
  rows: { label: string; value: string; color?: string }[];
}

export const VizTooltip = ({ title, rows }: VizTooltipProps): JSX.Element => (
  <div className="rounded-xl border border-line bg-white px-3 py-2 shadow-depth-8">
    <p className="mb-1 text-xs font-semibold text-ink">{title}</p>
    {rows.map((r) => (
      <p key={r.label} className="flex items-center gap-1.5 text-xs text-ink-secondary">
        {r.color && (
          <span className="h-2 w-2 rounded-[2px]" style={{ backgroundColor: r.color }} />
        )}
        <span>{r.label}</span>
        <span className="ml-auto pl-3 font-medium tabular-nums text-ink">{r.value}</span>
      </p>
    ))}
  </div>
);
