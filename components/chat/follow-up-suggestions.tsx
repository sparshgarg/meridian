'use client';

import { motion } from 'framer-motion';
import { MessageCircleQuestion } from 'lucide-react';

interface FollowUpSuggestionsProps {
  suggestions: string[];
  onPick: (prompt: string) => void;
  disabled: boolean;
  compact?: boolean;
}

export const FollowUpSuggestions = ({
  suggestions,
  onPick,
  disabled,
  compact = false,
}: FollowUpSuggestionsProps): JSX.Element | null => {
  if (suggestions.length === 0) return null;

  return (
    <div className={compact ? 'space-y-1.5' : 'space-y-2.5'}>
      <p
        className={`flex items-center gap-1.5 font-semibold uppercase tracking-widest text-ink-muted ${
          compact ? 'text-[10px]' : 'text-[11px]'
        }`}
      >
        <MessageCircleQuestion className={compact ? 'h-3 w-3' : 'h-3.5 w-3.5'} aria-hidden="true" />
        Ask next
      </p>
      <div className={`flex flex-wrap ${compact ? 'gap-1.5' : 'gap-2'}`}>
        {suggestions.map((prompt, index) => (
          <motion.button
            key={prompt}
            type="button"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04, type: 'spring', stiffness: 260, damping: 22 }}
            disabled={disabled}
            onClick={() => onPick(prompt)}
            className={`rounded-xl border border-line bg-white text-left text-ink shadow-depth-4 transition hover:border-accent/35 hover:text-accent hover:shadow-depth-8 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
              compact ? 'px-2.5 py-1.5 text-[11px] leading-snug' : 'px-3.5 py-2 text-sm leading-snug'
            }`}
          >
            {prompt}
          </motion.button>
        ))}
      </div>
    </div>
  );
};
