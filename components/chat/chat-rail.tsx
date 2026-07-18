'use client';

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Compass, Layers } from 'lucide-react';
import type { Turn } from './use-chat';
import { Composer } from './composer';
import { StatusTicker } from './status-ticker';
import { SuggestedPrompts } from './suggested-prompts';

interface ChatRailProps {
  turns: Turn[];
  isStreaming: boolean;
  activeTurnId: string | null;
  onSend: (content: string) => void;
  onSelectTurn: (id: string) => void;
}

// Left rail: brand, conversation history, live status, composer. Assistant
// answers appear as compact summary chips — the canvas is where they live.
export const ChatRail = ({ turns, isStreaming, activeTurnId, onSend, onSelectTurn }: ChatRailProps): JSX.Element => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const last = turns[turns.length - 1];

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [turns.length, last?.role === 'assistant' ? last.statuses.length : 0]);

  return (
    <aside className="flex h-full w-[390px] shrink-0 flex-col rounded-3xl bg-card-strong shadow-depth-16 ring-1 ring-black/[0.04]">
      <header className="flex items-center gap-2.5 border-b border-line px-5 py-4">
        <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-accent to-blue text-white shadow-depth-4">
          <Compass className="h-5 w-5" />
        </span>
        <div>
          <p className="font-display text-base font-semibold tracking-tight text-ink">Meridian</p>
          <p className="text-[11px] text-ink-muted">Product intelligence · Billing team</p>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {turns.length === 0 && <SuggestedPrompts onPick={onSend} disabled={isStreaming} />}

        {turns.map((turn) =>
          turn.role === 'user' ? (
            <motion.div
              key={turn.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="ml-8 rounded-2xl rounded-br-md bg-accent px-4 py-2.5 text-sm text-white shadow-depth-4"
            >
              {turn.content}
            </motion.div>
          ) : (
            <motion.div
              key={turn.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mr-8 space-y-2"
            >
              {turn.statuses.length > 0 && (
                <div className="rounded-2xl rounded-bl-md border border-line bg-card px-3.5 py-2.5">
                  <StatusTicker statuses={turn.statuses} />
                </div>
              )}
              {(turn.chapters.length > 0 || turn.state === 'done') && (
                <button
                  onClick={() => onSelectTurn(turn.id)}
                  className={`flex w-full items-center gap-2 rounded-2xl border px-3.5 py-2.5 text-left text-xs transition-all ${
                    activeTurnId === turn.id
                      ? 'border-accent/40 bg-accent-soft text-accent shadow-depth-4'
                      : 'border-line bg-card text-ink-secondary hover:shadow-depth-4'
                  }`}
                >
                  <Layers className="h-3.5 w-3.5 shrink-0" />
                  <span className="font-medium">
                    {turn.chapters.length} chapter{turn.chapters.length === 1 ? '' : 's'}
                    {turn.state === 'streaming' ? ' · streaming…' : ' on canvas'}
                  </span>
                </button>
              )}
            </motion.div>
          ),
        )}
      </div>

      <div className="border-t border-line px-4 py-4">
        <Composer onSend={onSend} disabled={isStreaming} />
        <p className="mt-2 text-center text-[10px] text-ink-muted/80">
          Mock mode · answers replay seeded demo data
        </p>
      </div>
    </aside>
  );
};
