'use client';

import { useEffect, useLayoutEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, RotateCcw, Sparkle } from 'lucide-react';
import type { AssistantTurn } from '@/components/chat/use-chat';
import { deriveFollowups } from '@/components/chat/derive-followups';
import { FollowUpSuggestions } from '@/components/chat/follow-up-suggestions';
import type { VisualAction } from '@/types/chapter';
import { ChapterCard } from './chapter-card';
import { EmptyState } from './empty-state';
import { ProcessingState } from './processing-state';

interface CanvasProps {
  turn: AssistantTurn | null;
  prompt: string | null; // the user question this answer responds to
  actionsDisabled: boolean;
  onAction: (action: VisualAction) => void;
  onFollowUp: (prompt: string) => void;
  canGoBack: boolean;
  onBack: () => void;
  scrollTop: number;
  onScrollPosition: (scrollTop: number) => void;
  focusRestoreKey: number;
  onRetry: (turnId: string) => void;
}

// The big surface. Renders the active assistant turn as a scrolling stack of
// chapter cards, auto-following the stream as new chapters land.
export const Canvas = ({
  turn,
  prompt,
  actionsDisabled,
  onAction,
  onFollowUp,
  canGoBack,
  onBack,
  scrollTop,
  onScrollPosition,
  focusRestoreKey,
  onRetry,
}: CanvasProps): JSX.Element => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLButtonElement>(null);
  const previousFocusRestoreKey = useRef(focusRestoreKey);
  const chapterCount = turn?.chapters.length ?? 0;
  const lastChapter = turn?.chapters[chapterCount - 1];
  const followups =
    turn?.state === 'done' ? deriveFollowups(turn) : [];

  useLayoutEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollTop });
    const restored = previousFocusRestoreKey.current !== focusRestoreKey;
    if (restored) {
      scrollRef.current?.focus({ preventScroll: true });
    } else if (canGoBack) {
      backRef.current?.focus({ preventScroll: true });
    }
    previousFocusRestoreKey.current = focusRestoreKey;
  }, [canGoBack, focusRestoreKey, scrollTop, turn?.id]);

  useEffect(() => {
    if (turn?.state === 'streaming') {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [chapterCount, lastChapter?.visual, lastChapter?.callouts.length, turn?.state]);

  if (!turn) return <EmptyState />;

  return (
    <div
      ref={scrollRef}
      tabIndex={-1}
      aria-label="Answer canvas"
      onScroll={(event) => onScrollPosition(event.currentTarget.scrollTop)}
      className="h-full overflow-y-auto scroll-smooth focus:outline-none"
    >
      <div className="mx-auto max-w-4xl space-y-5 px-6 py-8 pb-24">
        {canGoBack && (
          <button
            ref={backRef}
            type="button"
            onClick={onBack}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-line bg-card-strong px-3.5 py-2 text-sm font-semibold text-ink shadow-depth-4 transition hover:border-accent/30 hover:text-accent hover:shadow-depth-8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to previous answer
          </button>
        )}

        {prompt && (
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-sm font-medium text-ink-muted"
          >
            You asked: <span className="text-ink">“{prompt}”</span>
          </motion.p>
        )}

        {turn.headline && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 220, damping: 24 }}
            className="flex items-start gap-3 rounded-3xl bg-gradient-to-r from-accent to-blue p-5 text-white shadow-depth-glow"
          >
            <Sparkle className="mt-0.5 h-5 w-5 shrink-0" />
            <p className="font-display text-lg font-medium leading-snug">{turn.headline}</p>
          </motion.div>
        )}

        {turn.state === 'streaming' && turn.chapters.length === 0 && (
          <ProcessingState statuses={turn.statuses} />
        )}

        {turn.chapters.map((chapter, i) => (
          <ChapterCard
            key={chapter.id}
            chapter={chapter}
            index={i}
            isStreaming={turn.state === 'streaming' && i === chapterCount - 1}
            actionsDisabled={actionsDisabled}
            onAction={onAction}
          />
        ))}

        {turn.state === 'error' && (
          <div className="rounded-2xl border border-coral/40 bg-coral-soft p-4 text-sm text-ink" role="alert">
            <p className="font-semibold">The analysis did not complete.</p>
            <p className="mt-1 text-ink-secondary">{turn.error}</p>
            {turn.retryable && (
              <button
                type="button"
                onClick={() => onRetry(turn.id)}
                className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-xl bg-white px-3.5 py-2 font-semibold shadow-depth-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                Retry question
              </button>
            )}
          </div>
        )}

        {followups.length > 0 && (
          <div className="rounded-2xl border border-line bg-card-strong p-4 shadow-depth-4">
            <FollowUpSuggestions
              suggestions={followups}
              onPick={onFollowUp}
              disabled={actionsDisabled}
            />
          </div>
        )}
      </div>
    </div>
  );
};
