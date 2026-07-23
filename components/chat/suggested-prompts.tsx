'use client';

import { motion } from 'framer-motion';
import { BarChart3, Building2, CalendarRange, Layers3, TrendingUp } from 'lucide-react';

const SUGGESTIONS = [
  {
    icon: CalendarRange,
    label: 'What should we prioritize next quarter?',
    tint: 'text-accent bg-accent-soft',
  },
  {
    icon: Building2,
    label: 'Who are my top customers and what do they want?',
    tint: 'text-coral bg-coral-soft',
  },
  {
    icon: TrendingUp,
    label: 'Which themes are growing fastest over the last 90 days?',
    tint: 'text-aqua bg-aqua-soft',
  },
  {
    icon: BarChart3,
    label: 'Break signal volume down by customer segment',
    tint: 'text-blue bg-blue-soft',
  },
  {
    icon: Layers3,
    label: 'What does Figma want?',
    tint: 'text-coral bg-coral-soft',
  },
];

const MORE_SUGGESTIONS = [
  'Compare usage-based billing with dunning for enterprise accounts',
  'Show mention volume by industry for the last 90 days',
  'What do customers in healthcare want?',
  'Where are competitors beating us on usage-based billing?',
  'What is the ARR impact of usage-based billing?',
  'Who are my top enterprise customers?',
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
    <details className="rounded-xl px-1 pt-1 text-xs text-ink-muted">
      <summary className="cursor-pointer font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
        More supported questions
      </summary>
      <div className="mt-2 space-y-1.5">
        {MORE_SUGGESTIONS.map((prompt) => (
          <button
            key={prompt}
            type="button"
            disabled={disabled}
            onClick={() => onPick(prompt)}
            className="block w-full rounded-xl px-2 py-2 text-left text-ink-secondary transition hover:bg-card disabled:opacity-50"
          >
            {prompt}
          </button>
        ))}
      </div>
    </details>
  </div>
);
