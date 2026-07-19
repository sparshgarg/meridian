import { openai } from '@ai-sdk/openai';
import { google } from '@ai-sdk/google';
import type { LanguageModel } from 'ai';

// Model selection from env — OpenAI gpt-4o-mini by default (OPENAI_API_KEY is
// already in .env.example). Set GEN_PROVIDER=google + GEN_MODEL for Flash.
export const getModel = (): LanguageModel => {
  const provider = process.env.GEN_PROVIDER ?? 'openai';
  const model = process.env.GEN_MODEL ?? (provider === 'google' ? 'gemini-2.0-flash' : 'gpt-4o-mini');
  if (provider === 'google') return google(model);
  if (provider === 'openai') return openai(model);
  throw new Error(`Unknown GEN_PROVIDER "${provider}" — use "openai" or "google"`);
};

const RETRY_DELAYS_MS = [1000, 2000, 4000];
const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

// Initial attempt + up to 3 backoff retries (1s / 2s / 4s).
export const withRetry = async <T>(fn: () => Promise<T>, label: string): Promise<T> => {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt < RETRY_DELAYS_MS.length) {
        const delay = RETRY_DELAYS_MS[attempt];
        console.warn(`  ⚠ ${label} failed (attempt ${attempt + 1}/${RETRY_DELAYS_MS.length + 1}), retrying in ${delay}ms…`);
        await sleep(delay);
      }
    }
  }
  throw new Error(
    `${label} failed after ${RETRY_DELAYS_MS.length + 1} attempts: ${lastErr instanceof Error ? lastErr.message : String(lastErr)}`,
  );
};

// ── Cost accounting (display-only, approximate). ─────────────────────────────
interface ModelRate {
  inputPerM: number;
  outputPerM: number;
}
const RATES: Record<string, ModelRate> = {
  'gpt-4o-mini': { inputPerM: 0.15, outputPerM: 0.6 },
  'gemini-2.0-flash': { inputPerM: 0.1, outputPerM: 0.4 },
  'gemini-1.5-flash': { inputPerM: 0.075, outputPerM: 0.3 },
};

export class CostTracker {
  private inputTokens = 0;
  private outputTokens = 0;
  private warnedUnknown = false;

  constructor(private readonly model: string) {}

  add(usage: { inputTokens?: number; outputTokens?: number }): void {
    this.inputTokens += usage.inputTokens ?? 0;
    this.outputTokens += usage.outputTokens ?? 0;
  }

  get spent(): number {
    const rate = RATES[this.model];
    if (!rate) {
      if (!this.warnedUnknown) {
        console.warn(`  ⚠ No cost rate for model "${this.model}" — cost display will read $0.00`);
        this.warnedUnknown = true;
      }
      return 0;
    }
    return (this.inputTokens / 1_000_000) * rate.inputPerM + (this.outputTokens / 1_000_000) * rate.outputPerM;
  }
}
