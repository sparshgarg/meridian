/**
 * Verifies progressive disclosure against live databases. Each deep-dive
 * action runs as a separate request through the same flow used by Trigger.
 */
import { config } from 'dotenv';
import { join } from 'path';
import type { ChatRequest, DeepDiveId, StreamEvent, VisualType } from '../types/chapter';

config({ path: join(process.cwd(), '.env.local') });

const assert = (condition: boolean, message: string): void => {
  if (!condition) throw new Error(`ASSERT: ${message}`);
};

const collect = async (request: ChatRequest): Promise<StreamEvent[]> => {
  const { createAgentStream } = await import('../lib/agent-stream');
  const events: StreamEvent[] = [];
  for await (const event of createAgentStream(request)) events.push(event);
  return events;
};

const assertStream = (events: StreamEvent[]): void => {
  assert(events[0]?.type === 'message_start', 'stream must start with message_start');
  assert(events.at(-1)?.type === 'message_end', 'stream must end with message_end');
  assert(!events.some((event) => event.type === 'error'), 'stream must not emit an error');

  for (let index = 0; index < events.length; index += 1) {
    if (events[index].type !== 'chapter_start') continue;
    index += 1;
    while (events[index]?.type === 'chapter_intro_delta') index += 1;
    assert(events[index]?.type === 'chapter_visual', 'chapter visual must follow optional intro');
    while (
      events[index + 1]?.type === 'chapter_callout' ||
      events[index + 1]?.type === 'chapter_actions'
    ) {
      index += 1;
    }
  }
};

const hasVisual = (events: StreamEvent[], type: VisualType): boolean =>
  events.some((event) => event.type === 'chapter_visual' && event.visual.type === type);

const runDeepDive = async (
  id: DeepDiveId,
  expectedVisual: VisualType,
  priorHeadline: string,
): Promise<void> => {
  const events = await collect({
    conversation_id: 'e2e-progressive',
    messages: [
      { role: 'user', content: 'What should we prioritize next quarter?' },
      { role: 'assistant', content: priorHeadline },
      { role: 'user', content: id },
    ],
    action: { type: 'deep_dive', id },
  });
  assertStream(events);
  assert(hasVisual(events, expectedVisual), `${id} must render ${expectedVisual}`);
  assert(
    events.some(
      (event) =>
        event.type === 'status' &&
        event.status.state === 'done' &&
        /ClickHouse/i.test(event.status.label),
    ),
    `${id} must report fresh ClickHouse work`,
  );
  const detail = events.find(
    (event) => event.type === 'status' && event.status.state === 'done',
  );
  console.log(
    `  ${id}: ${expectedVisual} — ${detail?.type === 'status' ? detail.status.detail : ''}`,
  );
};

const main = async (): Promise<void> => {
  delete process.env.TRIGGER_SECRET_KEY;

  const initial = await collect({
    conversation_id: 'e2e-progressive',
    messages: [{ role: 'user', content: 'What should we prioritize next quarter?' }],
  });
  assertStream(initial);
  const chapters = initial.filter((event) => event.type === 'chapter_start');
  const headline = initial.find((event) => event.type === 'message_end');
  const actionEvents = initial.filter((event) => event.type === 'chapter_actions');

  assert(chapters.length === 2, `initial answer must have exactly 2 modules, got ${chapters.length}`);
  assert(hasVisual(initial, 'opportunity_ranking'), 'initial answer needs ranking');
  assert(hasVisual(initial, 'impact_waterfall'), 'initial answer needs compact impact');
  assert(!hasVisual(initial, 'volume_trap'), 'volume trap must remain hidden initially');
  assert(!hasVisual(initial, 'evidence_cards'), 'hidden-gem/evidence details must remain hidden');
  assert(!hasVisual(initial, 'competitor_matrix'), 'competitor matrix must remain hidden');
  assert(
    headline?.type === 'message_end' &&
      headline.headline === 'You should prioritize usage-based billing.',
    'initial recommendation must be the exact one-liner',
  );
  assert(
    actionEvents.flatMap((event) => event.type === 'chapter_actions' ? event.actions : []).length >= 5,
    'initial visuals must offer deep-dive actions',
  );

  const priorHeadline = headline?.type === 'message_end' ? headline.headline : '';
  await runDeepDive('why_usage', 'evidence_cards', priorHeadline);
  await runDeepDive('why_not_dunning', 'volume_trap', priorHeadline);
  await runDeepDive('explore_multi_entity', 'evidence_cards', priorHeadline);
  await runDeepDive('competitor_insight', 'competitor_matrix', priorHeadline);
  await runDeepDive('impact_details', 'impact_breakdown', priorHeadline);

  console.log(`OK — ${chapters.length} initial modules; 5 fresh deep-dive requests verified`);
};

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
