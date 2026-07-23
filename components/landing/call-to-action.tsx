import React from 'react';
import Link from 'next/link';

interface CTASectionProps {
  monoClass: string;
  interClass: string;
}

// CTASection renders the primary conversion button linking to the Chat interface.
// Incorporates focus-visible ring styles for keyboard accessibility, custom hover glow,
// and supports standard anchor properties wrapped via Next.js Link.
export const CTASection = ({ monoClass, interClass }: CTASectionProps): JSX.Element => {
  return (
    <div className="flex flex-wrap items-center gap-5 py-10 pb-[90px]">
      <Link
        href="/chat"
        className={`${monoClass} bg-[#46C7B0] text-[#06100e] font-bold text-[14px] py-[15px] px-[26px] tracking-[0.04em] transition-all duration-150 hover:bg-[#5fe0c8] hover:shadow-[0_0_24px_rgba(70,199,176,0.4)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#46C7B0] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0F0E] rounded-none`}
      >
        ▶ TRY MERIDIAN
      </Link>
      
      <span className={`${interClass} text-[13px] text-[#7d9a92]`}>
        Nothing to install — ask a question and see a real answer in seconds.
      </span>
    </div>
  );
};
