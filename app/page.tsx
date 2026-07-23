import React from 'react';
import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { TopStatusBar } from '@/components/landing/top-status-bar';
import { HeroSection } from '@/components/landing/hero';
import { HowItWorks } from '@/components/landing/how-it-works';
import { FlowDiagram } from '@/components/landing/flow-diagram';
import { CTASection } from '@/components/landing/call-to-action';

// Load fonts locally to avoid affecting the existing global fonts.
const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-landing-sans',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-landing-mono',
});

export const metadata: Metadata = {
  title: 'Meridian — Ask what to build next',
  description:
    'Meridian reads all your customer feedback — support tickets, interviews, and sales deals — and tells you what to prioritize, with the evidence to back it up. No spreadsheets, no guessing.',
};

// Console-style landing page served at root "/".
// Renders isolated dark theme aesthetics and grid overlay.
export default function LandingPage(): JSX.Element {
  const containerStyle: React.CSSProperties = {
    minHeight: '100vh',
    backgroundColor: '#0A0F0E',
    color: '#D6E2DD',
    backgroundImage: `
      linear-gradient(rgba(70, 199, 176, 0.04) 1px, transparent 1px),
      linear-gradient(90deg, rgba(70, 199, 176, 0.04) 1px, transparent 1px)
    `,
    backgroundSize: '40px 40px',
  };

  const monoClass = jetbrainsMono.className;
  const interClass = inter.className;

  return (
    <div style={containerStyle} className="w-full relative antialiased selection:bg-[#46C7B0]/20 selection:text-[#46C7B0]">
      <TopStatusBar monoClass={monoClass} />
      
      <main className="max-w-[1120px] mx-auto px-8">
        <HeroSection monoClass={monoClass} interClass={interClass} />
        <HowItWorks monoClass={monoClass} interClass={interClass} />
        <FlowDiagram monoClass={monoClass} interClass={interClass} />
        <CTASection monoClass={monoClass} interClass={interClass} />
      </main>
    </div>
  );
}
