'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BarChart3, Gem, MessageSquareText, PlugZap, type LucideIcon } from 'lucide-react';

interface SourceTool {
  name: string;
  logo: string;
}

interface SourceCategory {
  key: string;
  label: string;
  caption: string;
  count: number;
  icon: LucideIcon;
  badge: string;
  bar: string;
  tools: SourceTool[];
}

// Live counts verified against Postgres/ClickHouse (CONTEXT.md, 2026-07-22) —
// update alongside that doc if the seed data changes. Logos are real brand
// marks (public/logos/*.svg, sourced from Simple Icons + Wikimedia Commons).
const CATEGORIES: SourceCategory[] = [
  {
    key: 'tickets',
    label: 'Tickets',
    caption: 'Support tickets · 6 months',
    count: 956,
    icon: BarChart3,
    badge: 'bg-blue-soft text-blue',
    bar: 'bg-blue',
    tools: [
      { name: 'Zendesk', logo: '/logos/zendesk.svg' },
      { name: 'Intercom', logo: '/logos/intercom.svg' },
      { name: 'Freshworks', logo: '/logos/freshworks.svg' },
    ],
  },
  {
    key: 'interviews',
    label: 'Interviews',
    caption: 'Customer transcripts · 30–60 min each',
    count: 63,
    icon: MessageSquareText,
    badge: 'bg-aqua-soft text-aqua',
    bar: 'bg-aqua',
    tools: [
      { name: 'Zoom', logo: '/logos/zoom.svg' },
      { name: 'Dovetail', logo: '/logos/dovetail.svg' },
    ],
  },
  {
    key: 'customers',
    label: 'Customers',
    caption: 'Accounts · SMB, mid-market, enterprise',
    count: 123,
    icon: Gem,
    badge: 'bg-accent-soft text-accent',
    bar: 'bg-accent',
    tools: [
      { name: 'Salesforce', logo: '/logos/salesforce.svg' },
      { name: 'HubSpot', logo: '/logos/hubspot.svg' },
    ],
  },
];

const SourceLogo = ({ tool, onClick }: { tool: SourceTool; onClick: (name: string) => void }): JSX.Element => (
  <button
    type="button"
    title={tool.name}
    aria-label={`${tool.name} — connect this source`}
    onClick={() => onClick(tool.name)}
    className="flex h-14 items-center justify-center rounded-2xl bg-white px-4 ring-1 ring-line transition-transform hover:-translate-y-0.5 hover:shadow-depth-8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
  >
    {/* eslint-disable-next-line @next/next/no-img-element -- static brand-mark SVGs, no next/image benefit */}
    <img src={tool.logo} alt={tool.name} className="h-7 w-auto max-w-[6.5rem] object-contain" />
  </button>
);

const SourceCard = ({
  category,
  onLogoClick,
}: {
  category: SourceCategory;
  onLogoClick: (name: string) => void;
}): JSX.Element => {
  const Icon = category.icon;
  return (
    <div className="flex-1 rounded-4xl border border-line bg-card p-8 shadow-depth-16">
      <div className="flex items-center gap-4">
        <span className={`flex h-14 w-14 items-center justify-center rounded-3xl ${category.badge}`}>
          <Icon className="h-7 w-7" size={28} />
        </span>
        <div>
          <p className="font-display text-xl font-semibold text-ink">{category.label}</p>
          <p className="text-sm text-ink-muted">{category.caption}</p>
        </div>
      </div>

      <p className="mt-6 font-display text-7xl font-semibold tabular-nums text-ink">
        {category.count.toLocaleString()}
      </p>
      <div className={`mt-3 h-1.5 w-16 rounded-full ${category.bar}`} />

      <p className="mb-3 mt-7 text-xs font-semibold uppercase tracking-wide text-ink-muted">
        Connect this data from
      </p>
      <div className="flex flex-wrap gap-3">
        {category.tools.map((tool) => (
          <SourceLogo key={tool.name} tool={tool} onClick={onLogoClick} />
        ))}
      </div>
    </div>
  );
};

// Sits above the empty-state tagline: grounds the "ask across everything"
// pitch in real counts before the user has typed anything, and previews
// where live source connections will plug in.
export const DataSourceCards = (): JSX.Element => {
  const [toastTool, setToastTool] = useState<string | null>(null);

  useEffect(() => {
    if (!toastTool) return;
    const timer = setTimeout(() => setToastTool(null), 2600);
    return () => clearTimeout(timer);
  }, [toastTool]);

  return (
    <div className="relative w-full max-w-6xl">
      <div className="flex flex-col gap-6 lg:flex-row">
        {CATEGORIES.map((category) => (
          <SourceCard key={category.key} category={category} onLogoClick={setToastTool} />
        ))}
      </div>

      <div className="pointer-events-none absolute inset-x-0 -bottom-6 flex justify-center">
        <AnimatePresence>
          {toastTool && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 300, damping: 24 }}
              role="status"
              className="pointer-events-auto flex items-center gap-2 rounded-2xl bg-ink px-5 py-3 text-sm font-medium text-white shadow-depth-16"
            >
              <PlugZap className="h-4 w-4 shrink-0 text-aqua" />
              Capability to connect more sources like {toastTool} — coming soon.
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
