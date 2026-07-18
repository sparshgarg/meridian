'use client';

import { motion } from 'framer-motion';
import { BarChart3, FileSearch, Gem, MessageSquareText, Swords } from 'lucide-react';

const FLOATERS = [
  { icon: BarChart3, className: 'left-[12%] top-[18%] text-accent/70', delay: 0 },
  { icon: Gem, className: 'right-[16%] top-[26%] text-aqua/80', delay: 1.2 },
  { icon: Swords, className: 'left-[22%] bottom-[24%] text-coral/70', delay: 2.1 },
  { icon: FileSearch, className: 'right-[24%] bottom-[18%] text-blue/80', delay: 0.6 },
];

// Canvas empty state: floating vector glyphs over soft gradient blobs — sets
// the playful Fluent-depth tone before the first answer lands.
export const EmptyState = (): JSX.Element => (
  <div className="relative flex h-full flex-col items-center justify-center overflow-hidden">
    <div className="pointer-events-none absolute inset-0">
      <div className="absolute left-1/4 top-1/4 h-72 w-72 -translate-x-1/2 rounded-full bg-accent/[0.07] blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 h-80 w-80 translate-x-1/2 rounded-full bg-aqua/[0.09] blur-3xl" />
      {FLOATERS.map(({ icon: Icon, className, delay }, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 + delay * 0.2, type: 'spring', stiffness: 200, damping: 18 }}
          className={`absolute ${className}`}
          style={{ animationDelay: `${delay}s` }}
        >
          <span className="block animate-float-slow rounded-2xl bg-white p-3 shadow-depth-8">
            <Icon className="h-6 w-6" />
          </span>
        </motion.span>
      ))}
    </div>

    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 200, damping: 24 }}
      className="relative z-10 max-w-md text-center"
    >
      <span className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-accent to-blue text-white shadow-depth-glow">
        <MessageSquareText className="h-7 w-7" />
      </span>
      <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">
        Ask across everything your customers said
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-ink-secondary">
        900 tickets, 55 interviews, 200 deals, and a competitor board — synthesized into
        visual answers with every number traceable to its source.
      </p>
    </motion.div>
  </div>
);
