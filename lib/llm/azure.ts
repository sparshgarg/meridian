import { createAzure, type AzureOpenAIProvider } from '@ai-sdk/azure';
import type { LanguageModel } from 'ai';

/**
 * Azure OpenAI wiring for Meridian agent inference.
 *
 * Env (names only — values live in .env.local / Vercel / Trigger):
 *   AZURE_OPENAI_ENDPOINT      https://{resource}.openai.azure.com/
 *   AZURE_OPENAI_API_KEY
 *   AZURE_OPENAI_API_VERSION   e.g. 2024-12-01-preview
 *   AZURE_OPENAI_DEPLOYMENT    deployment name (model id for the SDK call)
 *
 * Uses deployment-based URLs + chat completions so preview API versions and
 * gpt-5.* models (max_completion_tokens) work with tool calling.
 */

const DEFAULT_API_VERSION = '2024-12-01-preview';
const DEFAULT_DEPLOYMENT = 'gpt-5.4-mini';

const stripSlash = (value: string): string => value.replace(/\/+$/, '');

/** Prefer explicit resource name; else parse from AZURE_OPENAI_ENDPOINT hostname. */
export const resolveAzureResourceName = (): string | undefined => {
  const explicit = process.env.AZURE_OPENAI_RESOURCE_NAME?.trim();
  if (explicit) return explicit;
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT?.trim();
  if (!endpoint) return undefined;
  try {
    const host = new URL(endpoint).hostname;
    const match = /^([^.]+)\.openai\.azure\.com$/i.exec(host);
    return match?.[1];
  } catch {
    return undefined;
  }
};

export const getAzureDeployment = (): string =>
  process.env.AZURE_OPENAI_DEPLOYMENT?.trim() ||
  process.env.AGENT_MODEL?.trim() ||
  DEFAULT_DEPLOYMENT;

export const getAzureApiVersion = (): string =>
  process.env.AZURE_OPENAI_API_VERSION?.trim() || DEFAULT_API_VERSION;

export const isAzureConfigured = (): boolean => {
  const key = process.env.AZURE_OPENAI_API_KEY?.trim();
  return Boolean(key && (resolveAzureResourceName() || process.env.AZURE_OPENAI_ENDPOINT?.trim()));
};

export const createMeridianAzure = (): AzureOpenAIProvider => {
  const apiKey = process.env.AZURE_OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('AZURE_OPENAI_API_KEY is required for Azure OpenAI');
  }

  const endpoint = process.env.AZURE_OPENAI_ENDPOINT?.trim();
  const resourceName = resolveAzureResourceName();
  const apiVersion = getAzureApiVersion();

  // Deployment-based path: {base}/deployments/{deployment}/chat/completions?api-version=…
  // base = https://{resource}.openai.azure.com/openai
  if (endpoint) {
    const base = stripSlash(endpoint);
    const baseURL = base.endsWith('/openai') ? base : `${base}/openai`;
    return createAzure({
      baseURL,
      apiKey,
      apiVersion,
      useDeploymentBasedUrls: true,
    });
  }

  if (!resourceName) {
    throw new Error(
      'Set AZURE_OPENAI_ENDPOINT or AZURE_OPENAI_RESOURCE_NAME for Azure OpenAI',
    );
  }

  return createAzure({
    resourceName,
    apiKey,
    apiVersion,
    useDeploymentBasedUrls: true,
  });
};

/** Chat Completions model — preferred for tool-calling agent turns. */
export const getAzureChatModel = (deployment?: string): LanguageModel => {
  const azure = createMeridianAzure();
  return azure.chat(deployment ?? getAzureDeployment());
};

/** Label for status ticker / logs — never includes credentials. */
export const getAzureModelLabel = (): string =>
  `Azure OpenAI · ${getAzureDeployment()}`;
