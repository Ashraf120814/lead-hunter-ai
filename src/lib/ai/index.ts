// =============================================================================
// AI Module Public API
// =============================================================================

export * from './agents/types';
export { qualificationAgent } from './agents/qualification';
export { salesAgent } from './agents/sales';
export { websiteStrategyAgent } from './agents/website-strategy';
export { rankingAgent } from './agents/ranking';
export { mockAIProvider } from './providers/mock';
export {
  getAIProvider,
  getActiveAIProviderName,
  createGeminiProvider,
  isGeminiConfigured,
  geminiCompleteJson,
} from './providers';

import { qualificationAgent } from './agents/qualification';
import { salesAgent } from './agents/sales';
import { websiteStrategyAgent } from './agents/website-strategy';
import { rankingAgent } from './agents/ranking';

/**
 * Convenience bundle of all agents.
 */
export const agents = {
  qualification: qualificationAgent,
  sales: salesAgent,
  websiteStrategy: websiteStrategyAgent,
  ranking: rankingAgent,
};
