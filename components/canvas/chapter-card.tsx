'use client';

import { motion } from 'framer-motion';
import {
  BarChart3,
  FileSearch,
  Gem,
  ListOrdered,
  Radar,
  Swords,
  TrendingUp,
  Triangle,
  Zap,
  ArrowRight,
} from 'lucide-react';
import type { Chapter, ChapterIcon, VisualAction } from '@/types/chapter';
import { CalloutCard } from './callout-card';
import { VisualRenderer } from './visual-renderer';

const chapterIcon: Record<ChapterIcon, typeof Radar> = {
  radar: Radar,
  ranking: ListOrdered,
  trap: Triangle,
  gem: Gem,
  swords: Swords,
  impact: BarChart3,
  evidence: FileSearch,
  trend: TrendingUp,
  summary: Zap,
};

interface ChapterCardProps {
  chapter: Chapter;
  index: number;
  isStreaming: boolean;
  actionsDisabled: boolean;
  onAction: (action: VisualAction) => void;
}

// One "chapter" of an answer: numbered header, streamed intro, a visual, and
// callouts — rendered as a floating card on the canvas.
export const ChapterCard = ({
  chapter,
  index,
  isStreaming,
  actionsDisabled,
  onAction,
}: ChapterCardProps): JSX.Element => {
  const Icon = chapterIcon[chapter.icon] ?? Zap;
  const introStreaming = isStreaming && !chapter.visual && chapter.callouts.length === 0;

  return (
    <motion.section
      initial={{ opacity: 0, y: 28, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 26 }}
      className="rounded-3xl bg-card-strong p-5 shadow-depth-8 ring-1 ring-black/[0.04] md:p-6"
    >
      <header className="mb-3 flex items-center gap-3">
        <motion.span
          initial={{ rotate: -12, scale: 0.6 }}
          animate={{ rotate: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 16 }}
          className="flex h-9 w-9 items-center justify-center rounded-2xl bg-accent-soft text-accent"
        >
          <Icon className="h-4.5 w-4.5" size={18} />
        </motion.span>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-muted">
            Chapter {index + 1}
          </p>
          <h2 className="font-display text-lg font-semibold tracking-tight text-ink">
            {chapter.title}
          </h2>
        </div>
      </header>

      {chapter.intro && (
        <p
          className={`mb-4 max-w-3xl text-sm leading-relaxed text-ink-secondary ${
            introStreaming ? 'stream-caret' : ''
          }`}
        >
          {chapter.intro}
        </p>
      )}

      {chapter.visual ? (
        <VisualRenderer visual={chapter.visual} title={chapter.title} />
      ) : (
        isStreaming && <div className="shimmer h-40 rounded-2xl" />
      )}

      {chapter.actions.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2" aria-label={`Explore ${chapter.title}`}>
          {chapter.actions.map((action) => (
            <button
              key={action.id}
              type="button"
              disabled={actionsDisabled}
              onClick={() => onAction(action)}
              aria-label={action.aria_label}
              className="group inline-flex min-h-10 items-center gap-2 rounded-xl border border-line bg-white px-3.5 py-2 text-sm font-semibold text-ink shadow-depth-4 transition hover:border-accent/30 hover:text-accent hover:shadow-depth-8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {action.label}
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </button>
          ))}
        </div>
      )}

      {chapter.callouts.length > 0 && (
        <div className="mt-4 space-y-3">
          {chapter.callouts.map((c) => (
            <CalloutCard key={c.title} callout={c} />
          ))}
        </div>
      )}
    </motion.section>
  );
};
