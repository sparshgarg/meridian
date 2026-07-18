'use client';

import { motion } from 'framer-motion';
import { AlertTriangle, Check, Sparkles } from 'lucide-react';
import type { GetCompetitivePositionOutput } from '@/types/agent-tools';
import { ChartFrame } from './chart-frame';
import { ink, status } from './palette';

// Boolean grid, not a heatmap: filled dot = competitor has it. The Meridian
// column is the subject — highlighted, with icon+label status (never color
// alone) for has / gap / greenfield.
export const CompetitorMatrix = ({ data }: { data: GetCompetitivePositionOutput }): JSX.Element => (
  <ChartFrame caption={`${data.competitors.length} competitors × ${data.features.length} features · from win/loss notes and public docs`}>
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-separate border-spacing-0 text-sm">
        <thead>
          <tr>
            <th className="sticky left-0 bg-card pb-2 pr-3 text-left text-xs font-medium text-ink-muted">
              Feature
            </th>
            <th className="rounded-t-xl bg-accent-soft px-2 pb-2 pt-2 text-center text-xs font-bold text-accent">
              Meridian
            </th>
            {data.competitors.map((c) => (
              <th key={c} className="px-2 pb-2 text-center text-xs font-medium text-ink-secondary">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.features.map((f, i) => {
            const greenfield = !f.meridian_has_feature && f.competitors_with_feature.length === 0;
            return (
              <motion.tr
                key={f.feature_name}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.05 }}
                className="group"
              >
                <td className="sticky left-0 max-w-[220px] border-t border-line bg-card py-2 pr-3">
                  <p className="truncate font-medium text-ink" title={f.feature_name}>
                    {f.feature_name}
                  </p>
                  {f.meridian_gap_notes && (
                    <p className="truncate text-[11px] text-ink-muted" title={f.meridian_gap_notes}>
                      {f.meridian_gap_notes}
                    </p>
                  )}
                </td>
                <td
                  className={`border-t border-line bg-accent-soft/70 px-2 py-2 text-center ${
                    i === data.features.length - 1 ? 'rounded-b-xl' : ''
                  }`}
                >
                  {f.meridian_has_feature ? (
                    <span
                      className="inline-flex items-center gap-1 text-[11px] font-semibold"
                      style={{ color: status.goodText }}
                    >
                      <Check className="h-3.5 w-3.5" /> Yes
                    </span>
                  ) : greenfield ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-accent">
                      <Sparkles className="h-3.5 w-3.5" /> Open
                    </span>
                  ) : (
                    <span
                      className="inline-flex items-center gap-1 text-[11px] font-semibold"
                      style={{ color: status.critical }}
                    >
                      <AlertTriangle className="h-3.5 w-3.5" /> Gap
                    </span>
                  )}
                </td>
                {data.competitors.map((c) => {
                  const has = f.competitors_with_feature.includes(c);
                  return (
                    <td key={c} className="border-t border-line px-2 py-2 text-center">
                      <span
                        aria-label={has ? `${c} has ${f.feature_name}` : `${c} lacks ${f.feature_name}`}
                        className="inline-block h-2.5 w-2.5 rounded-full"
                        style={{
                          backgroundColor: has ? ink.secondary : 'transparent',
                          boxShadow: has ? 'none' : `inset 0 0 0 1.5px ${ink.grid}`,
                        }}
                      />
                    </td>
                  );
                })}
              </motion.tr>
            );
          })}
        </tbody>
      </table>
    </div>
  </ChartFrame>
);
