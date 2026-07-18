'use client';

import { motion } from 'framer-motion';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import type { StatTile } from '@/types/chapter';

const deltaIcon = {
  up: ArrowUpRight,
  down: ArrowDownRight,
  flat: Minus,
} as const;

export const StatRow = ({ stats }: { stats: StatTile[] }): JSX.Element => (
  <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
    {stats.map((stat, i) => {
      const Icon = stat.delta ? deltaIcon[stat.delta.direction] : null;
      return (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.07, type: 'spring', stiffness: 260, damping: 24 }}
          className="rounded-2xl bg-card p-4 ring-1 ring-black/[0.06]"
        >
          <p className="text-xs font-medium text-ink-muted">{stat.label}</p>
          <p className="mt-1 font-display text-3xl font-semibold tracking-tight text-ink">
            {stat.value}
          </p>
          <div className="mt-1 flex items-center gap-2">
            {stat.delta && Icon && (
              <span
                className="flex items-center gap-0.5 text-xs font-semibold"
                style={{ color: stat.delta.good ? '#006300' : '#d03b3b' }}
              >
                <Icon className="h-3.5 w-3.5" />
                {stat.delta.value}
              </span>
            )}
            {stat.sub && <span className="text-xs text-ink-muted">{stat.sub}</span>}
          </div>
        </motion.div>
      );
    })}
  </div>
);
