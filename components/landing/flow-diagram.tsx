import React from 'react';

interface FlowDiagramProps {
  monoClass: string;
  interClass: string;
}

interface Node {
  id: string;
  label: string;
  title: string;
  desc: string;
  isKey?: boolean;
  tech?: string;
}

const nodes: Node[] = [
  {
    id: 'ask',
    label: '[ ask ]',
    title: 'You ask a question',
    desc: 'In plain English, like talking to a teammate.',
  },
  {
    id: 'understand',
    label: '[ understand ]',
    title: 'Meridian works out what to look up',
    desc: 'A smart assistant reads your question and gathers the right feedback to answer it.',
    isKey: true,
    tech: 'powered by Trigger.dev',
  },
  {
    id: 'search',
    label: '[ search ]',
    title: 'It reads all your feedback',
    desc: 'Support tickets, customer interviews, and sales deals — searched all at once.',
    isKey: true,
    tech: 'stored in ClickHouse + Postgres',
  },
  {
    id: 'rank',
    label: '[ rank ]',
    title: 'It ranks what matters most',
    desc: 'By real business impact — not just whatever gets complained about the most.',
  },
  {
    id: 'answer',
    label: '[ answer ]',
    title: 'You see the answer',
    desc: 'As clear charts and evidence you can click into — never a wall of text.',
  },
];

// "// WHAT HAPPENS WHEN YOU ASK" flow diagram.
// Shows processing pipeline with highlighted nodes and dynamic arrow rotation at 900px.
export const FlowDiagram = ({ monoClass, interClass }: FlowDiagramProps): JSX.Element => {
  return (
    <div className="py-14 border-t border-[#1c2c28]">
      <div className={`${monoClass} text-[12px] tracking-[0.2em] text-[#5b7a72] mb-2`}>
        // WHAT HAPPENS WHEN YOU ASK
      </div>
      
      <div className={`${interClass} text-[14px] text-[#6f8b82] mb-[30px]`}>
        The path your question takes, start to finish.
      </div>
      
      {/* 5-Node Flow Path */}
      <div className="flex flex-col min-[900px]:flex-row items-stretch">
        {nodes.map((node, i) => (
          <React.Fragment key={node.id}>
            {i > 0 && (
              <div className={`${monoClass} flex items-center justify-center text-[#46C7B0] px-1.5 shrink-0 rotate-90 min-[900px]:rotate-0 py-2 min-[900px]:py-0`}>
                →
              </div>
            )}
            <div
              className={`flex-1 border p-[16px_14px] ${
                node.isKey
                  ? 'border-[#2f6c60] bg-[rgba(70,199,176,0.06)]'
                  : 'border-[#1c2c28] bg-[rgba(70,199,176,0.02)]'
              }`}
            >
              <div className={`${monoClass} text-[#46C7B0] text-[11px] tracking-[0.1em]`}>
                {node.label}
              </div>
              <div className={`${monoClass} text-[#EAF4F0] text-[15px] mt-2 leading-[1.25] font-medium`}>
                {node.title}
              </div>
              <div className={`${interClass} text-[#9ab5ac] text-[12.5px] mt-2 leading-relaxed`}>
                {node.desc}
              </div>
              {node.tech && (
                <div className={`${monoClass} inline-block text-[10px] text-[#5b7a72] mt-2.5 tracking-wide`}>
                  {node.tech}
                </div>
              )}
            </div>
          </React.Fragment>
        ))}
      </div>
      
      {/* Behind the scenes banner */}
      <div className={`${interClass} mt-[18px] border border-dashed border-[#234d45] p-[14px_16px] text-[13px] text-[#9ab5ac] leading-relaxed flex flex-wrap gap-x-2.5 gap-y-1 items-baseline`}>
        <span className={`${monoClass} text-[#46C7B0] tracking-[0.1em] text-[10px] font-bold`}>
          // BEHIND THE SCENES
        </span>
        <span>Your tickets, interviews &amp; deals</span>
        <span className={`${monoClass} text-[#2f6c60]`}>→</span>
        <span>read and tagged by AI</span>
        <span className={`${monoClass} text-[#2f6c60]`}>→</span>
        <span>turned into searchable feedback</span>
        <span className={`${monoClass} text-[#2f6c60]`}>·</span>
        <span>kept up to date automatically as new data arrives</span>
      </div>
    </div>
  );
};
