'use client';

import { motion } from 'framer-motion';
import { MessageSquareText } from 'lucide-react';
import { DataSourceCards } from './data-source-cards';

// Canvas empty state: real data-source counts up top (grounds the "ask
// across everything" pitch before the user has typed anything), tagline
// below — sets the Fluent-depth tone before the first answer lands.
export const EmptyState = (): JSX.Element => (
  <div className="relative flex h-full flex-col items-center justify-center gap-10 overflow-hidden px-6 py-10">
    <div className="pointer-events-none absolute inset-0">
      <div className="absolute left-1/4 top-1/4 h-72 w-72 -translate-x-1/2 rounded-full bg-accent/[0.07] blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 h-80 w-80 translate-x-1/2 rounded-full bg-aqua/[0.09] blur-3xl" />
    </div>

    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 200, damping: 24 }}
      className="relative z-10 flex w-full justify-center"
    >
      <DataSourceCards />
    </motion.div>

    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15, type: 'spring', stiffness: 200, damping: 24 }}
      className="relative z-10 max-w-md text-center"
    >
      <span className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-accent to-blue text-white shadow-depth-glow">
        <MessageSquareText className="h-7 w-7" />
      </span>
      <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">
        Ask across everything your customers said
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-ink-secondary">
        956 tickets, 63 interviews, 123 accounts, and a competitor board — synthesized into
        visual answers with every number traceable to its source.
      </p>
    </motion.div>
  </div>
);
