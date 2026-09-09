// =============================================================================
// Qualification Agent — AI Business Summary
// Uses Gemini (or other LLM) when configured; falls back to templates.
// =============================================================================

import type { QualificationAgent, BusinessContext, AISummaryResult } from './types';
import type { OpportunityType } from '@/types';
import { getAIProvider, getActiveAIProviderName, geminiCompleteJson } from '../providers';
import { isAIConfigured } from '@/config/env';

function getName(ctx: BusinessContext): string {
  return (ctx.business as any).name || 'This business';
}

function getCategory(ctx: BusinessContext): string {
  return (ctx.business as any).category || 'local business';
}

function getLocation(ctx: BusinessContext): string {
  const b = ctx.business as any;
  const parts = [b.city, b.state, b.country].filter(Boolean);
  return parts.join(', ') || 'their local market';
}

function getRatingText(ctx: BusinessContext): string {
  const b = ctx.business as any;
  const rating = b.google_rating ?? b.googleRating;
  const reviews = b.review_count ?? b.reviewCount;
  if (rating != null && reviews != null) {
    return `${rating}★ rating with ${reviews}+ reviews`;
  }
  if (rating != null) return `${rating}★ Google rating`;
  return 'solid local reputation';
}

function templateSummary(ctx: BusinessContext): AISummaryResult {
  const name = getName(ctx);
  const category = getCategory(ctx);
  const location = getLocation(ctx);
  const ratingText = getRatingText(ctx);
  const scoring = ctx.scoring;
  const audit = ctx.audit as any;
  const socialCount = ctx.socialProfiles?.length ?? 0;

  let websitePhrase = '';
  if (!audit || audit.status === 'no_website' || (!audit.website_url && !audit.url)) {
    websitePhrase = 'currently has no public website';
  } else if (audit.qualityScore != null && audit.qualityScore < 40) {
    websitePhrase = `has a weak website (quality score ${audit.qualityScore}/100)`;
  } else if (audit.quality_score != null && audit.quality_score < 40) {
    websitePhrase = `has a weak website (quality score ${audit.quality_score}/100)`;
  } else if (audit.status === 'outdated' || audit.status === 'poor') {
    websitePhrase = 'has an outdated or poorly performing website';
  } else {
    websitePhrase = 'has a website that could still be significantly improved';
  }

  const socialPhrase =
    socialCount >= 2
      ? 'maintains an active social presence'
      : socialCount === 1
        ? 'has limited social media presence'
        : 'has minimal or no visible social media presence';

  const opportunity =
    scoring?.recommendedSolution ||
    (audit?.status === 'no_website' ? 'a professional business website' : 'a modern website redesign');

  const summary = `${name} is a ${category.toLowerCase()} in ${location} with ${ratingText}. The business ${websitePhrase} and ${socialPhrase}. A well-executed ${opportunity.toLowerCase()} with clear conversion paths, mobile-first design, and local SEO could meaningfully improve its digital performance and customer acquisition.`;

  const opportunityTypes: OpportunityType[] =
    scoring?.opportunityTypes ??
    (audit?.status === 'no_website' ? ['website'] : ['redesign', 'seo']);

  return {
    summary,
    opportunityTypes,
    recommendedSolution: scoring?.recommendedSolution ?? opportunity,
  };
}

async function llmSummary(ctx: BusinessContext): Promise<AISummaryResult | null> {
  if (!isAIConfigured()) return null;

  try {
    const provider = getAIProvider();
    const b = ctx.business as any;
    const audit = ctx.audit as any;
    const scoring = ctx.scoring;

    const facts = {
      name: b.name,
      category: b.category,
      location: getLocation(ctx),
      rating: b.google_rating ?? b.googleRating ?? null,
      reviews: b.review_count ?? b.reviewCount ?? 0,
      websiteStatus: audit?.status ?? 'unknown',
      websiteScore: audit?.quality_score ?? audit?.qualityScore ?? null,
      websiteUrl: audit?.website_url ?? audit?.url ?? null,
      leadScore: scoring?.leadScore ?? null,
      purchaseProbability: scoring?.purchaseProbability ?? null,
      phone: (ctx.contact as any)?.phone ?? null,
      socialCount: ctx.socialProfiles?.length ?? 0,
    };

    const system = `You are a B2B sales analyst for a web agency.
Write a short commercial lead summary (2-4 sentences).
Rules:
- Only use the provided facts. Never invent revenue, owner names, or contacts.
- Clearly treat purchase likelihood as an estimate if mentioned.
- Be concise and useful for a salesperson.
Return JSON: { "summary": string, "opportunityTypes": string[], "recommendedSolution": string }`;

    const prompt = `Facts about the business:\n${JSON.stringify(facts, null, 2)}\n\nProduce the JSON now.`;

    // geminiCompleteJson works with any AIProvider that returns text
    const result = await geminiCompleteJson<{
      summary: string;
      opportunityTypes?: string[];
      recommendedSolution?: string;
    }>(provider, { system, prompt, temperature: 0.5, maxTokens: 600 });

    if (!result?.summary) return null;

    return {
      summary: result.summary,
      opportunityTypes: (result.opportunityTypes as OpportunityType[]) ||
        scoring?.opportunityTypes ||
        ['website'],
      recommendedSolution:
        result.recommendedSolution ||
        scoring?.recommendedSolution ||
        'Professional business website',
    };
  } catch (err) {
    console.warn('[qualification] LLM summary failed, using template:', err);
    return null;
  }
}

export const qualificationAgent: QualificationAgent = {
  async generateSummary(ctx: BusinessContext): Promise<AISummaryResult> {
    const fromLlm = await llmSummary(ctx);
    if (fromLlm) return fromLlm;
    return templateSummary(ctx);
  },
};

export function qualificationProviderInfo() {
  return getActiveAIProviderName();
}
