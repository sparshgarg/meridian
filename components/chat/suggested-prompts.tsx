'use client';

import { motion } from 'framer-motion';
import { Building2, CalendarRange, FileSearch, Swords, TrendingUp } from 'lucide-react';

const SUGGESTIONS = [
  {
    icon: CalendarRange,
    label: 'What should we prioritize next quarter?',
    tint: 'text-accent bg-accent-soft',
  },
  {
    icon: Building2,
    label: 'What does Figma want?',
    tint: 'text-coral bg-coral-soft',
  },
  {
    icon: TrendingUp,
    label: 'What themes are growing fastest?',
    tint: 'text-aqua bg-aqua-soft',
  },
  {
    icon: Swords,
    label: 'Where are competitors beating us?',
    tint: 'text-blue bg-blue-soft',
  },
  {
    icon: FileSearch,
    label: 'Show me the evidence for usage-based billing',
    tint: 'text-coral bg-coral-soft',
  },
];

interface SuggestedPromptsProps {
  onPick: (prompt: string) => void;
  disabled: boolean;
}

export const SuggestedPrompts = ({ onPick, disabled }: SuggestedPromptsProps): JSX.Element => (
  <div className="space-y-2">
    <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-muted">
      Try asking
    </p>
    {SUGGESTIONS.map((s, i) => (
      <motion.button
        key={s.label}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 + i * 0.08, type: 'spring', stiffness: 240, damping: 22 }}
        whileHover={{ scale: 1.015, x: 2 }}
        whileTap={{ scale: 0.985 }}
        disabled={disabled}
        onClick={() => onPick(s.label)}
        className="flex w-full items-center gap-3 rounded-2xl border border-line bg-white p-3 text-left text-sm text-ink shadow-depth-4 transition-shadow hover:shadow-depth-8 disabled:opacity-50"
      >
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${s.tint}`}>
          <s.icon className="h-4 w-4" />
        </span>
        {s.label}
      </motion.button>
    ))}
  </div>
);
