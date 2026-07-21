import { task } from '@trigger.dev/sdk';
import { chat } from '@trigger.dev/sdk/ai';
import { streamText, stepCountIs } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import type { ChapterVisual, ChatRequest, StreamEvent } from '@/types/chapter';
import { runAgentFlow } from '@/lib/agent/prioritize-flow';
import { appendGeneralEvent, createGeneralTools } from './general-tools';
import { chapterEvents } from './streams';

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

const headlineFromModel = (text: string): string => {
  const firstLine = text
    .split('\n')
    .map((line) => line.trim())
    .find(Boolean);
  return (firstLine ?? 'Analysis complete.')
    .replace(/^[#>*\s]+/, '')
    .replace(/\*\*/g, '')
    .replace(/`/g, '')
    .slice(0, 240);
};

const pipeChapterFlow = async (body: ChatRequest): Promise<string> => {
  let headline = 'Analysis complete.';
  for await (const event of runAgentFlow(body)) {
    await chapterEvents.append(event);
    if (event.type === 'message_end') headline = event.headline;
  }
  return headline;
};

/**
 * Durable chapter stream task — createAgentStream triggers this and reads
 * `chapter-events`. Keeps the Next.js route thin while forcing live answers
 * through Trigger.dev.
 */
export const streamMeridianAnswer = task({
  id: 'stream-meridian-answer',
  maxDuration: 300,
  run: async (payload: ChatRequest): Promise<{ headline: string }> => {
    const headline = await pipeChapterFlow(payload);
    return { headline };
  },
});

/** General questions run here; the main demo and typed actions stay scripted. */
export const meridianChat = chat.agent({
  id: 'meridian-chat',
  maxDuration: 300,
  idleTimeoutInSeconds: 0,
  run: async ({ messages, signal }) => {
    const messageId = `msg_${Date.now().toString(36)}`;
    await appendGeneralEvent({ type: 'message_start', message_id: messageId });
    const tools = createGeneralTools(messageId);
    chat.endRun();
    return streamText({
      ...chat.toStreamTextOptions({ tools }),
      model: anthropic(process.env.AGENT_MODEL ?? 'claude-sonnet-4-5-20250929'),
      system: `You are Meridian, a visual-first product intelligence agent for Meridian Payments Billing.
Use the typed tools for every factual claim; never guess or invent data. Resolve customer names with
find_accounts before get_account_signals. If no account matches, say so plainly and do not substitute
global prioritization. Choose the one tool-driven visual that best answers the request, using a second
tool only when entity resolution requires it. Your final text must be one concise sentence that works
as the answer headline. Do not output markdown, tables, chart specs, JSON, or additional sections;
the application renders the selected tool output itself. Theme ids are
usage_based_billing, multi_entity_invoicing, dunning_customization, latam_tax, hybrid_revrec,
webhook_reliability, salesforce_sync, custom_invoice_pdf.`,
      messages,
      tools,
      abortSignal: signal,
      stopWhen: stepCountIs(8),
      onFinish: async ({ text }) => {
        await appendGeneralEvent({
          type: 'message_end',
          message_id: messageId,
          headline: headlineFromModel(text),
        });
      },
    });
  },
});
