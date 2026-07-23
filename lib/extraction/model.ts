import { anthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';
import { openai } from '@ai-sdk/openai';
import { groq } from '@ai-sdk/groq';
import type { LanguageModel } from 'ai';
import { getAzureChatModel, getAzureDeployment, isAzureConfigured } from '@/lib/llm/azure';

// Independent of GEN_PROVIDER — extraction is ~1,000 source docs (tickets +
// transcripts), so it's the place most worth switching to a cheaper bulk model.
// Defaults to Anthropic Haiku (verified quota). Set EXTRACT_PROVIDER=groq if
// Anthropic credit runs low — openai/gpt-oss-120b supports structured output.
// Optional: EXTRACT_PROVIDER=azure uses AZURE_OPENAI_* (same deployment as agent).
const DEFAULT_MODELS: Record<string, string> = {
  anthropic: 'claude-haiku-4-5-20251001',
  google: 'gemini-2.5-flash',
  openai: 'gpt-4o-mini',
  groq: 'openai/gpt-oss-120b',
  azure: 'gpt-5.4-mini',
};

const getProvider = (): string => process.env.EXTRACT_PROVIDER ?? 'anthropic';

export const getExtractModelName = (): string => {
  const provider = getProvider();
  if (provider === 'azure') {
    return process.env.EXTRACT_MODEL ?? getAzureDeployment();
  }
  return process.env.EXTRACT_MODEL ?? DEFAULT_MODELS[provider] ?? DEFAULT_MODELS.anthropic;
};

export const getExtractModel = (): LanguageModel => {
  const provider = getProvider();
  const model = getExtractModelName();
  if (provider === 'anthropic') return anthropic(model);
  if (provider === 'google') return google(model);
  if (provider === 'openai') return openai(model);
  if (provider === 'groq') return groq(model);
  if (provider === 'azure') {
    if (!isAzureConfigured()) {
      throw new Error('EXTRACT_PROVIDER=azure but AZURE_OPENAI_* credentials are missing');
    }
    return getAzureChatModel(model);
  }
  throw new Error(
    `Unknown EXTRACT_PROVIDER "${provider}" — use "anthropic", "google", "openai", "groq", or "azure"`,
  );
};
