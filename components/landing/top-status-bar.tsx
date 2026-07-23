import React from 'react';

interface TopStatusBarProps {
  monoClass: string;
}

// Thin monospace status bar running across the top of the landing page.
// The pulsing dot uses motion-safe to respect users with motion sensitivities.
export const TopStatusBar = ({ monoClass }: TopStatusBarProps): JSX.Element => {
  return (
    <div
      className={`${monoClass} flex flex-wrap gap-[30px] px-8 py-4 border-b border-[#1c2c28] text-[11px] tracking-[0.1em] text-[#5b7a72]`}
    >
      <span className="flex items-center text-[#46C7B0]">
        <span className="mr-1.5 motion-safe:animate-[pulse_2s_infinite]">●</span>
        SIGNAL LIVE
      </span>
      <span>CLICKHOUSE · OLAP</span>
      <span>TRIGGER.DEV · AGENT</span>
      <span className="sm:ml-auto">SESSION // Q4-PLANNING</span>
    </div>
  );
};
