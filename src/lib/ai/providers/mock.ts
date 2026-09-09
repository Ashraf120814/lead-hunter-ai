// =============================================================================
// Mock AI Provider — deterministic templates for development
// Swap with real Grok / OpenAI implementation via env.
// =============================================================================

import type { AIProvider } from '../agents/types';

export const mockAIProvider: AIProvider = {
  async complete({ prompt }) {
    // Extremely simple echo for development.
    // Real agents below use structured templates instead of calling this.
    return `[MOCK AI RESPONSE]\nPrompt length: ${prompt.length} chars\n(Replace with real LLM in production)`;
  },
};
