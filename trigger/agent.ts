import { task } from '@trigger.dev/sdk';
import { chat } from '@trigger.dev/sdk/ai';
import { streamText, stepCountIs } from 'ai';
import type { ChapterVisual, ChatRequest, StreamEvent } from '@/types/chapter';
import { runAgentFlow } from '@/lib/agent/prioritize-flow';
import {
  getAgentMaxOutputTokens,
  getAgentModel,
  getAgentModelStatusDetail,
} from '@/lib/llm/agent-model';
import {
  appendGeneralEvent,
  createGeneralTools,
  getSuggestedFollowups,
} from './general-tools';
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
  const cleaned = (firstLine ?? 'Analysis complete.')
    .replace(/^[#>*\s]+/, '')
    .replace(/\*\*/g, '')
    .replace(/`/g, '');
  if (cleaned.length <= 220) return cleaned;
  const shortened = cleaned.slice(0, 217);
  return `${shortened.slice(0, shortened.lastIndexOf(' '))}…`;
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
    await appendGeneralEvent({
      type: 'status',
      status: {
        id: `${messageId}_model`,
        label: 'Selecting inference model',
        detail: getAgentModelStatusDetail(),
        state: 'done',
        source: 'agent',
        phase: 'understanding',
      },
    });
    const tools = createGeneralTools(messageId);
    chat.endRun();
    return streamText({
      ...chat.toStreamTextOptions({ tools }),
      model: getAgentModel(),
      maxOutputTokens: getAgentMaxOutputTokens(),
      system: `You are Meridian, a visual-first product intelligence agent for Meridian Payments Billing.
Workflow for every novel question:
1) Call plan_answer first (data sources + chart mark + whether text fallback is better).
2) Fetch ClickHouse data with typed tools only — never invent numbers or free-form SQL.
3) Prefer existing visuals (top_accounts, account_snapshot, trend_lines, comparison_bars, source_mix,
   opportunity_ranking, evidence_cards, competitor_matrix, impact_waterfall) when they already fit.
4) For novel breakdowns, call aggregate_signals then render_dynamic_chart with a Zod DynamicChartSpec
   (constrained chart DSL: bar/grouped_bar/stacked_bar/horizontal_bar/line/area/scatter/kpi/table).
5) If charting is inappropriate or validation would fail, call render_text_answer (short) or report_no_data.
6) Call suggest_followups with 3–5 concrete next questions before finishing.

Routing rules (critical):
- "Top customers / biggest accounts / who are my customers and what do they want" → list_top_accounts
  (ARR-ranked portfolio + each account's top themes). Default limit 5. Optional segment filter.
- A named company ("What does Figma want?") → find_accounts with ONLY the company name token, then
  get_account_signals. Never pass the full user question into find_accounts.
- Theme prioritization / ranking → list_opportunities_ranked (or compare_signals).
- Trends → get_theme_trends. Competitors → get_competitive_position. Impact → get_impact_projection.
- Weather / general knowledge / out-of-domain → report_no_data reason=unsupported.
- Unknown company name after a proper find_accounts miss → report_no_data (or rely on tool no_data).
- Never substitute global prioritization for unknown entities.
- Preserve conversation context for follow-ups such as "enterprise only".

Your final text must be one concise headline sentence — no markdown/tables/JSON. Theme ids:
usage_based_billing, multi_entity_invoicing, dunning_customization, latam_tax, hybrid_revrec,
webhook_reliability, salesforce_sync, custom_invoice_pdf.`,
      messages,
      tools,
      abortSignal: signal,
      stopWhen: stepCountIs(12),
      onFinish: async ({ text }) => {
        const followups = getSuggestedFollowups(messageId);
        await appendGeneralEvent({
          type: 'status',
          status: {
            id: `${messageId}_complete`,
            label: 'Analysis complete',
            state: 'done',
            source: 'agent',
            phase: 'complete',
          },
        });
        await appendGeneralEvent({
          type: 'message_end',
          message_id: messageId,
          headline: headlineFromModel(text),
          suggested_followups: followups.length > 0 ? followups : undefined,
        });
      },
    });
  },
});
