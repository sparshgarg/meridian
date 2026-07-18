// ── Person A: this is your file. ─────────────────────────────────────────────
// Scaffolded skeleton only — the real chat.agent() definition is yours.
//
// THE CONTRACT (see /types/chapter.ts and CLAUDE.md § Frontend integration):
// The frontend POSTs a ChatRequest to /app/api/chat and reads back NDJSON where
// every line is one StreamEvent. To go live:
//
//   1. Define the agent here with Trigger.dev's chat.agent() + the four tools
//      typed in /types/agent-tools.ts (backed by ClickHouse/Postgres queries
//      in /lib/queries).
//   2. As the agent works, emit StreamEvents:
//        - tool call started/finished  → { type: 'status', ... }
//        - each answer section         → chapter_start → chapter_intro_delta*
//                                        → chapter_visual → chapter_callout*
//        - tool outputs pass through   → chapter_visual.data is literally the
//                                        tool's typed output (no reshaping)
//   3. In /app/api/chat/route.ts, branch on NEXT_PUBLIC_AGENT_MODE === 'live':
//      trigger the run and pipe its stream through as the same NDJSON.
//      The mock path there shows exactly what the frontend expects to receive,
//      including pacing — it is your reference implementation.
//
// helpers below are pure and safe to keep or delete.

import type { ChapterVisual, StreamEvent } from '@/types/chapter';

export const statusEvent = (
  id: string,
  label: string,
  state: 'running' | 'done',
  detail?: string,
): StreamEvent => ({ type: 'status', status: { id, label, state, detail } });

export const visualEvent = (chapterId: string, visual: ChapterVisual): StreamEvent => ({
  type: 'chapter_visual',
  chapter_id: chapterId,
  visual,
});

export const encodeNdjson = (event: StreamEvent): string => `${JSON.stringify(event)}\n`;
