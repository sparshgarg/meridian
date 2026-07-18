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
} from 'lucide-react';
import type { Chapter, ChapterIcon } from '@/types/chapter';
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
}

// One "chapter" of an answer: numbered header, streamed intro, a visual, and
// callouts — rendered as a floating card on the canvas.
export const ChapterCard = ({ chapter, index, isStreaming }: ChapterCardProps): JSX.Element => {
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

      <p
        className={`mb-4 max-w-3xl text-sm leading-relaxed text-ink-secondary ${
          introStreaming ? 'stream-caret' : ''
        }`}
      >
        {chapter.intro}
      </p>

      {chapter.visual ? (
        <VisualRenderer visual={chapter.visual} />
      ) : (
        isStreaming && <div className="shimmer h-40 rounded-2xl" />
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
