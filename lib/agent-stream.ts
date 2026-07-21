import { tasks } from '@trigger.dev/sdk';
import { AgentChat } from '@trigger.dev/sdk/chat';
import type { ChatRequest, StreamEvent } from '@/types/chapter';
import { runAgentFlow } from '@/lib/agent/prioritize-flow';
import { isPrioritizePrompt } from '@/lib/agent/stream-helpers';
import { chapterEvents } from '@/trigger/streams';

// ─────────────────────────────────────────────────────────────────────────────
// THE LIVE SEAM — yields typed StreamEvents for route.ts → NDJSON.
//
// Prefer Trigger.dev task `stream-meridian-answer` (pipes chapter-events stream)
// so live answers run on the Trigger worker. Falls back to in-process
// runAgentFlow when TRIGGER_SECRET_KEY is missing (local without worker).
// chat.agent() lives in trigger/agent.ts and shares the same runAgentFlow.
// ─────────────────────────────────────────────────────────────────────────────

export async function* createAgentStream(body: ChatRequest): AsyncGenerator<StreamEvent> {
  const lastUser = [...body.messages].reverse().find((message) => message.role === 'user');
  const scripted = Boolean(body.action) || isPrioritizePrompt(lastUser?.content ?? '');

  if (!process.env.TRIGGER_SECRET_KEY) {
    if (scripted) {
      yield* runAgentFlow(body);
    } else {
      yield {
        type: 'error',
        message: 'General data chat requires a configured Trigger.dev worker.',
      };
    }
    return;
  }

  try {
    if (!scripted) {
      yield* runGeneralAgent(body);
      return;
    }
    const handle = await tasks.trigger('stream-meridian-answer', body);
    const stream = await chapterEvents.read(handle.id, { timeoutInSeconds: 180 });
    for await (const event of stream) {
      yield event;
      if (event.type === 'message_end' || event.type === 'error') break;
    }
  } catch (err) {
    // Worker down / stream unavailable — still serve the answer in-process so
    // the live demo doesn't hard-fail. Log for operators.
    console.error('[createAgentStream] Trigger path failed, falling back in-process:', err);
    if (scripted) {
      yield* runAgentFlow(body);
    } else {
      yield {
        type: 'error',
        message: err instanceof Error ? err.message : 'The data-chat agent failed.',
      };
    }
  }
}

async function* runGeneralAgent(body: ChatRequest): AsyncGenerator<StreamEvent> {
  let resolveRunId: (runId: string) => void = () => undefined;
  const runIdPromise = new Promise<string>((resolve) => {
    resolveRunId = resolve;
  });
  const agent = new AgentChat({
    agent: 'meridian-chat',
    id: `${body.conversation_id}-${Date.now().toString(36)}`,
    streamTimeoutSeconds: 180,
    onTriggered: ({ runId }) => resolveRunId(runId),
  });
  const history = body.messages
    .map((message) => `${message.role.toUpperCase()}: ${message.content}`)
    .join('\n');

  try {
    const response = await agent.sendMessage(
      `Answer the latest USER request using Meridian's real data tools.\n\n${history}`,
    );
    const runId = await runIdPromise;
    const drainResponse = response.text();
    const stream = await chapterEvents.read(runId, { timeoutInSeconds: 180 });
    for await (const event of stream) {
      yield event;
      if (event.type === 'message_end' || event.type === 'error') break;
    }
    await drainResponse;
  } finally {
    await agent.close();
  }
}
