'use client';

import { motion } from 'framer-motion';
import { AlertTriangle, BookMarked, Lightbulb, Target } from 'lucide-react';
import type { Callout } from '@/types/chapter';

const toneMeta = {
  insight: { icon: Lightbulb, bar: '#4a3aa7', bg: 'bg-accent-soft/60', label: 'Insight' },
  warning: { icon: AlertTriangle, bar: '#ec835a', bg: 'bg-coral-soft/70', label: 'Watch out' },
  evidence: { icon: BookMarked, bar: '#2a78d6', bg: 'bg-blue-soft/70', label: 'Provenance' },
  recommendation: { icon: Target, bar: '#006300', bg: 'bg-aqua-soft/70', label: 'Recommendation' },
} as const;

export const CalloutCard = ({ callout }: { callout: Callout }): JSX.Element => {
  const meta = toneMeta[callout.tone];
  return (
    <motion.aside
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 240, damping: 26 }}
      className={`relative overflow-hidden rounded-2xl ${meta.bg} p-4 pl-5`}
    >
      <span className="absolute inset-y-0 left-0 w-1" style={{ backgroundColor: meta.bar }} />
      <div className="flex items-start gap-3">
        <span
          className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-white shadow-depth-4"
          style={{ color: meta.bar }}
        >
          <meta.icon className="h-4 w-4" />
        </span>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: meta.bar }}>
            {meta.label}
          </p>
          <p className="text-sm font-semibold text-ink">{callout.title}</p>
          <p className="mt-0.5 text-sm leading-relaxed text-ink-secondary">{callout.body}</p>
        </div>
      </div>
    </motion.aside>
  );
};
