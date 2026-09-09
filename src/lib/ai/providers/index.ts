// =============================================================================
// AI Provider factory — Gemini → OpenAI → xAI → mock
// =============================================================================

import type { AIProvider } from '../agents/types';
import { env } from '@/config/env';
import { createGeminiProvider, isGeminiConfigured } from './gemini';
import { mockAIProvider } from './mock';

/**
 * Optional OpenAI-compatible complete (OpenAI or any compatible base URL).
 */
function createOpenAICompatibleProvider(
  apiKey: string,
  model: string,
  baseUrl = 'https://api.openai.com/v1'
): AIProvider {
  return {
    async complete({ system, prompt, temperature = 0.7, maxTokens = 2048 }) {
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          temperature,
          max_tokens: maxTokens,
          messages: [
            ...(system ? [{ role: 'system', content: system }] : []),
            { role: 'user', content: prompt },
          ],
        }),
      });
      if (!res.ok) {
        throw new Error(`OpenAI-compatible error ${res.status}: ${(await res.text()).slice(0, 400)}`);
      }
      const data = await res.json();
      const text = data.choices?.[0]?.message?.content;
      if (!text) throw new Error('Empty completion from OpenAI-compatible API');
      return text;
    },
  };
}

/**
 * Resolve the active LLM provider from environment.
 * Priority: Gemini → OpenAI → xAI Grok → mock
 */
export function getAIProvider(): AIProvider {
  if (isGeminiConfigured(env.geminiApiKey)) {
    return createGeminiProvider({
      apiKey: env.geminiApiKey,
      model: env.aiModel || 'gemini-2.0-flash',
    });
  }

  if (env.openaiApiKey) {
    return createOpenAICompatibleProvider(
      env.openaiApiKey,
      env.aiModel && !env.aiModel.startsWith('grok') ? env.aiModel : 'gpt-4o-mini'
    );
  }

  if (env.xaiApiKey) {
    return createOpenAICompatibleProvider(
      env.xaiApiKey,
      env.aiModel || 'grok-2',
      'https://api.x.ai/v1'
    );
  }

  return mockAIProvider;
}

export function getActiveAIProviderName(): 'gemini' | 'openai' | 'xai' | 'mock' {
  if (isGeminiConfigured(env.geminiApiKey)) return 'gemini';
  if (env.openaiApiKey) return 'openai';
  if (env.xaiApiKey) return 'xai';
  return 'mock';
}

export { createGeminiProvider, isGeminiConfigured, geminiCompleteJson } from './gemini';
export { mockAIProvider } from './mock';
