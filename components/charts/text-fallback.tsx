'use client';

import type { TextFallback } from '@/types/dynamic-chart';

export const TextFallbackCard = ({ data }: { data: TextFallback }): JSX.Element => (
  <div
    className="rounded-2xl border border-line bg-surface px-5 py-4 shadow-depth-4"
    role="note"
    aria-label={data.title}
  >
    <h3 className="font-display text-base font-semibold text-ink">{data.title}</h3>
    <p className="mt-2 text-sm leading-relaxed text-ink-secondary">{data.body}</p>
    {data.bullets && data.bullets.length > 0 ? (
      <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-ink-secondary">
        {data.bullets.map((bullet) => (
          <li key={bullet}>{bullet}</li>
        ))}
      </ul>
    ) : null}
  </div>
);
