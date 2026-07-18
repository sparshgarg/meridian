import type { ChatRequest, StreamEvent } from '@/types/chapter';
import { pickScenario } from './mock/scenarios';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ─────────────────────────────────────────────────────────────────────────────
// PERSON A INTEGRATION POINT
// This route is the single seam between frontend and agent. In mock mode it
// replays a scripted scenario as an NDJSON stream of StreamEvents. To go live,
// branch on AGENT_MODE: trigger the Trigger.dev chat.agent() run and pipe its
// output through as the same StreamEvent NDJSON. The frontend never changes.
// ─────────────────────────────────────────────────────────────────────────────

const encoder = new TextEncoder();

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

// Small delays make the stream feel like real agent work without slowing demos.
const INTRO_CHUNK_MS = 24;
const BETWEEN_STEPS_MS = 350;

export async function POST(req: Request): Promise<Response> {
  const body = (await req.json()) as ChatRequest;
  const lastUser = [...body.messages].reverse().find((m) => m.role === 'user');
  const scenario = pickScenario(lastUser?.content ?? '');
  const messageId = `msg_${Date.now().toString(36)}`;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (event: StreamEvent): void => {
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      };

      try {
        emit({ type: 'message_start', message_id: messageId });

        let chapterIdx = 0;
        for (const [stepIdx, step] of scenario.steps.entries()) {
          if (step.kind === 'status') {
            const id = `st_${stepIdx}`;
            emit({ type: 'status', status: { id, label: step.label, state: 'running' } });
            await sleep(step.duration_ms);
            emit({ type: 'status', status: { id, label: step.label, detail: step.detail, state: 'done' } });
            continue;
          }

          const chapterId = `${messageId}_ch${chapterIdx++}`;
          emit({ type: 'chapter_start', chapter_id: chapterId, title: step.title, icon: step.icon });

          // Stream the intro in word-sized deltas, like a live LLM.
          const words = step.intro.split(' ');
          for (let i = 0; i < words.length; i += 3) {
            emit({
              type: 'chapter_intro_delta',
              chapter_id: chapterId,
              delta: (i === 0 ? '' : ' ') + words.slice(i, i + 3).join(' '),
            });
            await sleep(INTRO_CHUNK_MS);
          }

          if (step.visual) {
            await sleep(200);
            emit({ type: 'chapter_visual', chapter_id: chapterId, visual: step.visual });
          }
          for (const callout of step.callouts ?? []) {
            await sleep(300);
            emit({ type: 'chapter_callout', chapter_id: chapterId, callout });
          }
          await sleep(BETWEEN_STEPS_MS);
        }

        emit({ type: 'message_end', message_id: messageId, headline: scenario.headline });
      } catch (err) {
        emit({ type: 'error', message: err instanceof Error ? err.message : 'stream failed' });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
    },
  });
}
