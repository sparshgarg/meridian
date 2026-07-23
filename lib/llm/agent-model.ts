import { anthropic } from '@ai-sdk/anthropic';
import type { LanguageModel } from 'ai';
import {
  getAzureChatModel,
  getAzureDeployment,
  getAzureModelLabel,
  isAzureConfigured,
} from './azure';

/**
 * Primary agent model resolver.
 *
 * Default: Azure OpenAI when AZURE_OPENAI_* is configured.
 * Fallback: Anthropic (legacy) via AGENT_PROVIDER=anthropic or missing Azure config.
 *
 * AGENT_PROVIDER=azure|anthropic (default azure when configured, else anthropic)
 * AGENT_MODEL / AZURE_OPENAI_DEPLOYMENT — model or deployment name
 */
export type AgentProvider = 'azure' | 'anthropic';

export const getAgentProvider = (): AgentProvider => {
  const explicit = process.env.AGENT_PROVIDER?.trim().toLowerCase();
  if (explicit === 'anthropic') return 'anthropic';
  if (explicit === 'azure') {
    if (!isAzureConfigured()) {
      throw new Error('AGENT_PROVIDER=azure but AZURE_OPENAI_* credentials are missing');
    }
    return 'azure';
  }
  return isAzureConfigured() ? 'azure' : 'anthropic';
};

export const getAgentModelName = (): string => {
  if (getAgentProvider() === 'azure') return getAzureDeployment();
  return process.env.AGENT_MODEL?.trim() || 'claude-sonnet-4-5-20250929';
};

export const getAgentModel = (): LanguageModel => {
  if (getAgentProvider() === 'azure') return getAzureChatModel();
  return anthropic(getAgentModelName());
};

/** Safe status detail for the rail ticker (no secrets). */
export const getAgentModelStatusDetail = (): string => {
  if (getAgentProvider() === 'azure') return getAzureModelLabel();
  return `Anthropic · ${getAgentModelName()}`;
};

/**
 * Newer Azure gpt-5.* models expect max_completion_tokens (AI SDK maps
 * maxOutputTokens → max_completion_tokens for gpt-5*). Cap agent headlines.
 */
export const getAgentMaxOutputTokens = (): number => {
  const raw = process.env.AGENT_MAX_OUTPUT_TOKENS?.trim();
  if (raw) {
    const parsed = Number.parseInt(raw, 10);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return getAgentProvider() === 'azure' ? 1024 : 1024;
};
