import type { DeepDiveId, StreamEvent } from '@/types/chapter';

export const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

export const usdCompact = (n: number): string => {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${Math.round(n)}`;
};

export const withCommas = (n: number): string => Math.round(n).toLocaleString('en-US');

/** Word-chunk intro deltas — matches mock pacing contract. */
export async function* yieldIntroDeltas(
  chapterId: string,
  intro: string,
  chunkMs = 18,
): AsyncGenerator<StreamEvent> {
  const words = intro.split(' ');
  for (let i = 0; i < words.length; i += 3) {
    yield {
      type: 'chapter_intro_delta',
      chapter_id: chapterId,
      delta: (i === 0 ? '' : ' ') + words.slice(i, i + 3).join(' '),
    };
    await sleep(chunkMs);
  }
}

export async function* yieldStatus(
  id: string,
  label: string,
  detail: string,
  durationMs = 400,
): AsyncGenerator<StreamEvent> {
  yield { type: 'status', status: { id, label, state: 'running' } };
  await sleep(durationMs);
  yield { type: 'status', status: { id, label, detail, state: 'done' } };
}

export type FlowKind =
  | 'prioritize'
  | 'top_customers'
  | 'dunning'
  | 'competitive'
  | 'usage_evidence'
  | 'multi_entity'
  | 'impact_details'
  | 'general';

const actionFlow: Record<DeepDiveId, FlowKind> = {
  why_usage: 'usage_evidence',
  why_not_dunning: 'dunning',
  explore_multi_entity: 'multi_entity',
  competitor_insight: 'competitive',
  impact_details: 'impact_details',
};

export const pickFlowKind = (prompt: string, actionId?: DeepDiveId): FlowKind => {
  if (actionId) return actionFlow[actionId];
  if (isPrioritizePrompt(prompt)) return 'prioritize';
  if (isTopCustomersPrompt(prompt)) return 'top_customers';
  return 'general';
};

export const isPrioritizePrompt = (prompt: string): boolean => {
  const normalized = prompt.trim().toLowerCase().replace(/[?.!]+$/, '');
  return [
    'what should we prioritize next quarter',
    'what should we prioritize',
    'what should the billing team prioritize next quarter',
  ].includes(normalized);
};

/** Portfolio / ARR leaderboard questions — deterministic ClickHouse path. */
export const isTopCustomersPrompt = (prompt: string): boolean => {
  const normalized = prompt.trim().toLowerCase();
  if (
    /\b(top|biggest|largest|highest)\b/.test(normalized)
    && /\b(customers?|accounts?|clients?)\b/.test(normalized)
  ) {
    return true;
  }
  if (
    /\bwho are (my|our)\b/.test(normalized)
    && /\b(customers?|accounts?)\b/.test(normalized)
  ) {
    return true;
  }
  if (/\bcustomer(?:s)? by arr\b/.test(normalized) || /\baccounts? by arr\b/.test(normalized)) {
    return true;
  }
  return false;
};

/** Scripted flows that skip the LLM chat.agent path. */
export const isScriptedPrompt = (prompt: string): boolean =>
  isPrioritizePrompt(prompt) || isTopCustomersPrompt(prompt);
