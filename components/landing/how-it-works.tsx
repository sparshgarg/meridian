import React from 'react';

interface HowItWorksProps {
  monoClass: string;
  interClass: string;
}

interface Step {
  idx: string;
  title: string;
  desc: string;
}

const steps: Step[] = [
  {
    idx: '[01]',
    title: 'You ask',
    desc: "Type a planning question the way you'd say it out loud — like \"what should we build next quarter?\" There's nothing to set up first.",
  },
  {
    idx: '[02]',
    title: 'Meridian looks',
    desc: 'It reads through every support ticket, customer interview, and sales deal, and weighs them all together in seconds.',
  },
  {
    idx: '[03]',
    title: 'You decide',
    desc: "You get a ranked list of what to build, so the loudest complaint doesn't automatically win and quiet-but-valuable ideas aren't missed — with the exact quotes behind every point.",
  },
];

// "// HOW IT WORKS" section component.
// Employs a custom CSS grid mapping that shifts layout from a 3-column baseline
// on desktop to a 2-column wrapped structure on smaller screens (<900px).
export const HowItWorks = ({ monoClass, interClass }: HowItWorksProps): JSX.Element => {
  return (
    <div className="py-14 border-t border-[#1c2c28] mt-14">
      <div className={`${monoClass} text-[12px] tracking-[0.2em] text-[#5b7a72] mb-2`}>
        // HOW IT WORKS
      </div>
      
      <div className={`${interClass} text-[14px] text-[#6f8b82] mb-[30px]`}>
        Three steps from a question to a decision you can defend.
      </div>
      
      <div className="divide-y divide-[#142120]/40">
        {steps.map((step) => (
          <div
            key={step.idx}
            className={`${monoClass} grid grid-cols-[40px_1fr] min-[900px]:grid-cols-[60px_180px_1fr] gap-x-5 gap-y-2 py-5 items-baseline`}
          >
            <span className="col-start-1 text-[13px] text-[#46C7B0]">
              {step.idx}
            </span>
            <span className="col-start-2 min-[900px]:col-start-2 text-[16px] text-[#EAF4F0]">
              {step.title}
            </span>
            <span className={`${interClass} col-start-2 min-[900px]:col-start-3 text-[14px] text-[#9ab5ac] leading-[1.55]`}>
              {step.desc}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
