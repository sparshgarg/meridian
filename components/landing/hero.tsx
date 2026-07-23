import React from 'react';
import Link from 'next/link';

interface HeroSectionProps {
  monoClass: string;
  interClass: string;
}

// Hero section for the console-style landing page.
// Defines the blinking cursor animation inline.
// Handles responsive grid border adjustments at 900px to maintain clean gridlines.
export const HeroSection = ({ monoClass, interClass }: HeroSectionProps): JSX.Element => {
  return (
    <div className="py-[70px] md:pb-[50px]">
      <style>{`
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
      `}</style>
      
      <div className={`${monoClass} text-[12px] tracking-[0.2em] text-[#46C7B0] mb-[26px]`}>
        // PRODUCT INTELLIGENCE FOR PRODUCT TEAMS
      </div>
      
      <div className={`${monoClass} text-[15px] text-[#7d9a92] mb-1.5`}>
        <span className="text-[#46C7B0]">you ~ $</span> "what should we build next quarter?"
      </div>
      
      <h1 className={`${monoClass} text-[34px] min-[900px]:text-[46px] font-bold leading-[1.08] text-[#EAF4F0] tracking-tight max-w-[820px]`}>
        Ask what to build next. Get an answer you can trust.
        <span className="inline-block w-3 h-10 bg-[#46C7B0] align-[-6px] ml-1 motion-safe:animate-[blink_1.1s_steps(2)_infinite]" />
      </h1>
      
      <p className={`${interClass} text-[17px] leading-relaxed text-[#9ab5ac] max-w-[620px] mt-5`}>
        Meridian reads all your customer feedback — support tickets, interviews, and sales deals — and tells you what to prioritize, with the evidence to back it up. No spreadsheets, no guessing.
      </p>

      <div className="flex flex-wrap items-center gap-4 mt-8">
        <Link
          href="/chat"
          className={`${monoClass} inline-flex items-center bg-[#46C7B0] text-[#06100e] font-bold text-[14px] py-[14px] px-[26px] tracking-[0.04em] transition-all duration-150 hover:bg-[#5fe0c8] hover:shadow-[0_0_24px_rgba(70,199,176,0.4)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#46C7B0] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0F0E]`}
        >
          ▶ TRY MERIDIAN
        </Link>
        <Link
          href="/chat"
          className={`${monoClass} inline-flex items-center gap-2 text-[13px] tracking-[0.04em] text-[#7d9a92] border border-[#1c2c28] py-[13px] px-[20px] transition-colors duration-150 hover:text-[#EAF4F0] hover:border-[#46C7B0]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#46C7B0]`}
        >
          ask a question →
        </Link>
      </div>

      <div className={`${monoClass} grid grid-cols-2 min-[900px]:grid-cols-4 border border-[#1c2c28] mt-11`}>
        {/* Stat 1 */}
        <div className="p-[22px_20px] border-r border-[#1c2c28] border-b min-[900px]:border-b-0">
          <div className="text-[34px] font-bold text-[#EAF4F0]">1,802</div>
          <div className="text-[11px] tracking-[0.12em] text-[#5b7a72] mt-1.5 uppercase">pieces of feedback read</div>
        </div>
        
        {/* Stat 2 */}
        <div className="p-[22px_20px] border-r-0 min-[900px]:border-r border-[#1c2c28] border-b min-[900px]:border-b-0">
          <div className="text-[34px] font-bold text-[#EAF4F0]">956</div>
          <div className="text-[11px] tracking-[0.12em] text-[#5b7a72] mt-1.5 uppercase">support tickets</div>
        </div>
        
        {/* Stat 3 */}
        <div className="p-[22px_20px] border-r border-[#1c2c28]">
          <div className="text-[34px] font-bold text-[#EAF4F0]">63</div>
          <div className="text-[11px] tracking-[0.12em] text-[#5b7a72] mt-1.5 uppercase">customer interviews</div>
        </div>
        
        {/* Stat 4 */}
        <div className="p-[22px_20px]">
          <div className="text-[34px] font-bold text-[#EAF4F0]">
            14<span className="text-[14px] text-[#46C7B0] ml-1">deals</span>
          </div>
          <div className="text-[11px] tracking-[0.12em] text-[#5b7a72] mt-1.5 uppercase">won &amp; lost</div>
        </div>
      </div>
    </div>
  );
};
