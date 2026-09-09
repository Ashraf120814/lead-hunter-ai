// =============================================================================
// AI Agent Interfaces
// Each agent is a focused, replaceable module.
// =============================================================================

import type {
  Lead,
  Business,
  WebsiteAudit,
  Contact,
  SocialProfile,
  ScoringResult,
  CallScript,
  OpportunityType,
} from '@/types';
import type { RawBusiness, WebsiteAuditResult } from '@/lib/providers/types';

export interface BusinessContext {
  business: Business | RawBusiness;
  contact?: Contact | null;
  socialProfiles?: SocialProfile[];
  audit?: WebsiteAudit | WebsiteAuditResult | null;
  scoring?: ScoringResult | null;
}

export interface AISummaryResult {
  summary: string;
  opportunityTypes: OpportunityType[];
  recommendedSolution: string;
}

export interface WebsitePromptResult {
  prompt: string;
  recommendedPages: string[];
  designDirection: string;
}

export interface EmailVariant {
  version: 'professional' | 'friendly' | 'high_conversion';
  subject: string;
  body: string;
}

export interface MessageVariant {
  channel: 'instagram_dm' | 'facebook_messenger' | 'linkedin' | 'whatsapp' | 'sms' | 'contact_form';
  body: string;
}

// ---------- Agent Interfaces ----------

export interface QualificationAgent {
  /**
   * Generate a concise commercial summary + opportunity tags.
   * Must clearly separate verified facts from estimates.
   */
  generateSummary(ctx: BusinessContext): Promise<AISummaryResult>;
}

export interface SalesAgent {
  generateEmails(ctx: BusinessContext): Promise<EmailVariant[]>;
  generateMessages(ctx: BusinessContext): Promise<MessageVariant[]>;
  generateCallScript(ctx: BusinessContext): Promise<CallScript>;
  generateFollowUps(
    ctx: BusinessContext,
    days: number[]
  ): Promise<Array<{ day: number; subject: string; body: string }>>;
}

export interface WebsiteStrategyAgent {
  recommendSolution(ctx: BusinessContext): Promise<string>;
  generateWebsitePrompt(ctx: BusinessContext): Promise<WebsitePromptResult>;
}

export interface RankingAgent {
  /**
   * Rank leads and return top N with short reasons.
   */
  recommendTopLeads(
    leads: Lead[],
    limit?: number
  ): Promise<Array<{ leadId: string; reason: string; priority: number }>>;
}

export interface AIProvider {
  /**
   * Low-level completion. Used by agents.
   * Implementations: Grok, OpenAI, Anthropic, local, or mock.
   */
  complete(params: {
    system?: string;
    prompt: string;
    temperature?: number;
    maxTokens?: number;
  }): Promise<string>;
}
