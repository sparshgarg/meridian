'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowUp } from 'lucide-react';

interface ComposerProps {
  onSend: (content: string) => void;
  disabled: boolean;
}

export const Composer = ({ onSend, disabled }: ComposerProps): JSX.Element => {
  const [value, setValue] = useState('');

  const submit = (): void => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue('');
  };

  return (
    <div className="relative">
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
        rows={2}
        placeholder="Ask about themes, accounts, competitors…"
        className="w-full resize-none rounded-2xl border border-line bg-white py-3 pl-4 pr-12 text-sm text-ink placeholder:text-ink-muted/70 shadow-depth-4 outline-none transition-shadow focus:border-accent/40 focus:shadow-depth-glow"
      />
      <motion.button
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        onClick={submit}
        disabled={disabled || !value.trim()}
        aria-label="Send"
        className="absolute bottom-3 right-2.5 flex h-8 w-8 items-center justify-center rounded-xl bg-accent text-white shadow-depth-4 transition-opacity disabled:opacity-30"
      >
        <ArrowUp className="h-4 w-4" />
      </motion.button>
    </div>
  );
};
