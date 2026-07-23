'use client';

import { Sparkles } from 'lucide-react';
import type { TextFallback } from '@/types/dynamic-chart';

// Visual-first house style: the answer is a chart whenever possible, so this
// text card stays deliberately compact — a one-line lead and at most three
// tight takeaways. Long model prose is clamped, never a wall of text.
export const TextFallbackCard = ({ data }: { data: TextFallback }): JSX.Element => {
  const bullets = (data.bullets ?? []).slice(0, 3);
  return (
    <div
      className="rounded-2xl border border-line bg-white px-5 py-4 shadow-depth-4"
      role="note"
      aria-label={data.title}
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
          <Sparkles className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <h3 className="font-display text-base font-semibold text-ink">{data.title}</h3>
          <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-ink-secondary">{data.body}</p>
        </div>
      </div>

      {bullets.length > 0 && (
        <ul className="mt-3 flex flex-col gap-1.5">
          {bullets.map((bullet) => (
            <li key={bullet} className="flex items-start gap-2 text-sm text-ink-secondary">
              <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-accent/60" />
              <span className="line-clamp-1">{bullet}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
