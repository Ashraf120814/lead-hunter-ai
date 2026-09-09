// =============================================================================
// Google Gemini AI Provider
// Uses Generative Language API (AI Studio / Gemini API key)
// Docs: https://ai.google.dev/api
// =============================================================================

import type { AIProvider } from '../agents/types';

export type GeminiModel =
  | 'gemini-2.0-flash'
  | 'gemini-2.0-flash-lite'
  | 'gemini-1.5-flash'
  | 'gemini-1.5-pro'
  | 'gemini-2.5-flash'
  | 'gemini-2.5-pro'
  | string;

export interface GeminiProviderOptions {
  apiKey: string;
  model?: GeminiModel;
  /** API version path segment */
  apiVersion?: 'v1beta' | 'v1';
  baseUrl?: string;
}

interface GeminiPart {
  text?: string;
}

interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: GeminiPart[]; role?: string };
    finishReason?: string;
  }>;
  error?: { message?: string; code?: number; status?: string };
  promptFeedback?: { blockReason?: string };
}

/**
 * Create a Gemini-backed AIProvider.
 */
export function createGeminiProvider(options: GeminiProviderOptions): AIProvider {
  const {
    apiKey,
    model = 'gemini-2.0-flash',
    apiVersion = 'v1beta',
    baseUrl = 'https://generativelanguage.googleapis.com',
  } = options;

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is required to create the Gemini provider');
  }

  return {
    async complete({ system, prompt, temperature = 0.7, maxTokens = 2048 }) {
      const endpoint = `${baseUrl}/${apiVersion}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

      const userText = [system ? `System instructions:\n${system}` : null, prompt]
        .filter(Boolean)
        .join('\n\n');

      const body = {
        contents: [
          {
            role: 'user',
            parts: [{ text: userText }],
          },
        ],
        generationConfig: {
          temperature: clamp(temperature, 0, 2),
          maxOutputTokens: Math.max(64, Math.min(maxTokens, 8192)),
        },
        safetySettings: [
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
        ],
      };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = (await res.json()) as GeminiResponse;

      if (!res.ok) {
        const msg =
          data?.error?.message ||
          `Gemini API error ${res.status}: ${JSON.stringify(data).slice(0, 400)}`;
        throw new Error(msg);
      }

      if (data.promptFeedback?.blockReason) {
        throw new Error(`Gemini blocked the prompt: ${data.promptFeedback.blockReason}`);
      }

      const text = data.candidates?.[0]?.content?.parts
        ?.map((p) => p.text || '')
        .join('')
        .trim();

      if (!text) {
        throw new Error(
          `Gemini returned empty content (finishReason: ${data.candidates?.[0]?.finishReason || 'unknown'})`
        );
      }

      return text;
    },
  };
}

/**
 * Convenience: ask Gemini and parse JSON from the response.
 * Strips markdown code fences if present.
 */
export async function geminiCompleteJson<T>(
  provider: AIProvider,
  params: {
    system?: string;
    prompt: string;
    temperature?: number;
    maxTokens?: number;
  }
): Promise<T> {
  const raw = await provider.complete({
    ...params,
    system:
      (params.system || '') +
      '\n\nRespond with valid JSON only. No markdown fences, no commentary.',
  });

  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // Try to extract first {...} or [...]
    const match = cleaned.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (match) {
      return JSON.parse(match[1]) as T;
    }
    throw new Error(`Failed to parse Gemini JSON: ${cleaned.slice(0, 200)}`);
  }
}

export function isGeminiConfigured(apiKey?: string | null): boolean {
  return Boolean(apiKey && apiKey.trim().length > 0);
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}
