// =============================================================================
// Lead Hunter AI — Lead Scoring Engine
// Pure function. Configurable weights. Transparent breakdown.
// Distinguishes verified signals from estimated opportunity.
// =============================================================================

import type {
  ScoringInput,
  ScoringResult,
  ScoringWeights,
  ScoreBreakdown,
  AIConfidence,
  HeatScore,
  OpportunityType,
} from '@/types';
import {
  DEFAULT_SCORING_WEIGHTS,
  STAR_RATING_THRESHOLDS,
  getHeatFromScore,
  isLowDigitalMaturity,
  suggestOpportunityTypes,
  recommendWebsiteType,
} from './config';

/**
 * Clamp a number between min and max.
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Normalize a raw score to the maximum points allowed for that component.
 */
function scaleToMax(raw: number, maxPoints: number): number {
  return clamp(Math.round(raw), 0, maxPoints);
}

/**
 * Website Opportunity (default max 25)
 * Highest score when there is no website or a very poor website
 * combined with a viable business.
 */
function scoreWebsiteOpportunity(
  input: ScoringInput,
  maxPoints: number
): number {
  let raw = 0;

  if (!input.hasWebsite || input.websiteStatus === 'no_website') {
    raw = 100; // maximum opportunity
  } else if (input.websiteStatus === 'broken') {
    raw = 95;
  } else if (input.websiteStatus === 'outdated' || input.websiteStatus === 'poor') {
    raw = 85;
  } else if (input.websiteQualityScore !== null) {
    // Invert quality: lower quality → higher opportunity
    raw = 100 - input.websiteQualityScore;
  } else if (input.websiteStatus === 'average') {
    raw = 55;
  } else if (input.websiteStatus === 'good') {
    raw = 25;
  } else {
    raw = 10; // excellent
  }

  // Boost if high offline strength + weak digital
  if (
    input.googleRating !== null &&
    input.googleRating >= 4.3 &&
    input.reviewCount >= 50 &&
    (input.websiteQualityScore === null || input.websiteQualityScore < 50)
  ) {
    raw = Math.min(100, raw + 15);
  }

  // Industry boost for low digital maturity sectors
  if (isLowDigitalMaturity(input.category)) {
    raw = Math.min(100, raw + 8);
  }

  return scaleToMax((raw / 100) * maxPoints, maxPoints);
}

/**
 * Business Strength (default max 25)
 * Based on rating, review volume, and size signals.
 */
function scoreBusinessStrength(
  input: ScoringInput,
  maxPoints: number
): number {
  let points = 0;

  // Rating component (0-10)
  if (input.googleRating !== null) {
    if (input.googleRating >= 4.7) points += 10;
    else if (input.googleRating >= 4.4) points += 8;
    else if (input.googleRating >= 4.0) points += 6;
    else if (input.googleRating >= 3.5) points += 3;
    else points += 1;
  }

  // Review volume (0-10)
  if (input.reviewCount >= 500) points += 10;
  else if (input.reviewCount >= 200) points += 8;
  else if (input.reviewCount >= 100) points += 6;
  else if (input.reviewCount >= 50) points += 4;
  else if (input.reviewCount >= 20) points += 2;
  else if (input.reviewCount >= 5) points += 1;

  // Size / longevity (0-5)
  if (input.estimatedEmployees && input.estimatedEmployees >= 20) points += 3;
  else if (input.estimatedEmployees && input.estimatedEmployees >= 5) points += 2;

  if (input.yearEstablished) {
    const age = new Date().getFullYear() - input.yearEstablished;
    if (age >= 10) points += 2;
    else if (age >= 5) points += 1;
  }

  // Normalize to maxPoints (assume raw max ~25)
  const normalized = (points / 25) * maxPoints;
  return scaleToMax(normalized, maxPoints);
}

/**
 * Online Activity (default max 20)
 * Social presence indicates modern business awareness.
 */
function scoreOnlineActivity(
  input: ScoringInput,
  maxPoints: number
): number {
  let points = 0;

  // Base for having any social
  if (input.socialProfilesCount >= 1) points += 4;
  if (input.socialProfilesCount >= 2) points += 3;
  if (input.socialProfilesCount >= 3) points += 3;

  if (input.hasInstagram) points += 4;
  if (input.hasFacebook) points += 2;
  if (input.hasLinkedIn) points += 2;
  if (input.hasActiveSocial) points += 2;

  // Cap and scale
  const normalized = (Math.min(points, 20) / 20) * maxPoints;
  return scaleToMax(normalized, maxPoints);
}

/**
 * Contactability (default max 15)
 * Critical for outreach success.
 */
function scoreContactability(
  input: ScoringInput,
  maxPoints: number
): number {
  let points = 0;

  if (input.hasPhone) points += 6;
  if (input.hasEmail) points += 5;
  if (input.hasWhatsApp) points += 3;
  if (input.hasBookingLink) points += 1;

  const normalized = (Math.min(points, 15) / 15) * maxPoints;
  return scaleToMax(normalized, maxPoints);
}

/**
 * Purchase Signals (default max 15)
 * Composite of opportunity + strength indicators that increase likelihood of buying.
 */
function scorePurchaseSignals(
  input: ScoringInput,
  maxPoints: number
): number {
  let points = 0;

  // Strong offline + weak digital is the classic high-intent signal
  const strongOffline =
    input.googleRating !== null &&
    input.googleRating >= 4.2 &&
    input.reviewCount >= 40;

  const weakDigital =
    !input.hasWebsite ||
    input.websiteStatus === 'no_website' ||
    input.websiteStatus === 'poor' ||
    input.websiteStatus === 'outdated' ||
    input.websiteStatus === 'broken' ||
    (input.websiteQualityScore !== null && input.websiteQualityScore < 45);

  if (strongOffline && weakDigital) {
    points += 8;
  } else if (weakDigital) {
    points += 4;
  }

  // Contactable + opportunity
  if ((input.hasPhone || input.hasEmail) && weakDigital) {
    points += 3;
  }

  // Low digital maturity industry
  if (isLowDigitalMaturity(input.category)) {
    points += 2;
  }

  // High review volume shows they care about reputation → more open to digital improvement
  if (input.reviewCount >= 100) {
    points += 2;
  }

  const normalized = (Math.min(points, 15) / 15) * maxPoints;
  return scaleToMax(normalized, maxPoints);
}

/**
 * Calculate star rating (1-5) from lead score.
 */
function calculateStarRating(leadScore: number): number {
  for (const threshold of STAR_RATING_THRESHOLDS) {
    if (leadScore >= threshold.minScore) {
      return threshold.stars;
    }
  }
  return 1;
}

/**
 * Estimate purchase probability (0-100).
 * This is an AI-style estimate, not a verified fact.
 */
function estimatePurchaseProbability(
  leadScore: number,
  input: ScoringInput
): number {
  // Base from lead score
  let prob = leadScore * 0.85;

  // Adjustments
  if (input.hasPhone || input.hasEmail) prob += 5;
  if (
    input.googleRating !== null &&
    input.googleRating >= 4.5 &&
    input.reviewCount >= 100
  ) {
    prob += 5;
  }
  if (input.websiteStatus === 'no_website') prob += 4;
  if (isLowDigitalMaturity(input.category)) prob += 3;

  return clamp(Math.round(prob), 5, 97); // never claim 100% or 0%
}

/**
 * Determine AI confidence based on data completeness.
 */
function determineConfidence(input: ScoringInput): AIConfidence {
  let signals = 0;

  if (input.googleRating !== null) signals++;
  if (input.reviewCount > 0) signals++;
  if (input.hasWebsite || input.websiteStatus === 'no_website') signals++;
  if (input.websiteQualityScore !== null) signals++;
  if (input.hasPhone || input.hasEmail) signals++;
  if (input.socialProfilesCount > 0) signals++;
  if (input.category) signals++;

  if (signals >= 6) return 'high';
  if (signals >= 3) return 'medium';
  return 'low';
}

/**
 * Main scoring function.
 * Pure, deterministic, transparent.
 */
export function calculateLeadScore(
  input: ScoringInput,
  weights: ScoringWeights = DEFAULT_SCORING_WEIGHTS
): ScoringResult {
  // Ensure weights sum roughly to 100 (normalize if needed)
  const totalWeight =
    weights.website_opportunity +
    weights.business_strength +
    weights.online_activity +
    weights.contactability +
    weights.purchase_signals;

  const norm = totalWeight > 0 ? 100 / totalWeight : 1;

  const w = {
    website_opportunity: Math.round(weights.website_opportunity * norm),
    business_strength: Math.round(weights.business_strength * norm),
    online_activity: Math.round(weights.online_activity * norm),
    contactability: Math.round(weights.contactability * norm),
    purchase_signals: Math.round(weights.purchase_signals * norm),
  };

  // Recalculate to guarantee exact 100
  const sum =
    w.website_opportunity +
    w.business_strength +
    w.online_activity +
    w.contactability +
    w.purchase_signals;
  if (sum !== 100) {
    w.website_opportunity += 100 - sum; // adjust largest component
  }

  const websiteOpp = scoreWebsiteOpportunity(input, w.website_opportunity);
  const businessStr = scoreBusinessStrength(input, w.business_strength);
  const onlineAct = scoreOnlineActivity(input, w.online_activity);
  const contact = scoreContactability(input, w.contactability);
  const purchase = scorePurchaseSignals(input, w.purchase_signals);

  const total = websiteOpp + businessStr + onlineAct + contact + purchase;

  const breakdown: ScoreBreakdown = {
    website_opportunity: websiteOpp,
    business_strength: businessStr,
    online_activity: onlineAct,
    contactability: contact,
    purchase_signals: purchase,
    total,
  };

  const leadScore = clamp(total, 0, 100);
  const starRating = calculateStarRating(leadScore);
  const purchaseProbability = estimatePurchaseProbability(leadScore, input);
  const aiConfidence = determineConfidence(input);
  const heatScore: HeatScore = getHeatFromScore(leadScore);

  const opportunityTypes: OpportunityType[] = suggestOpportunityTypes({
    websiteStatus: input.websiteStatus,
    qualityScore: input.websiteQualityScore,
    category: input.category,
    hasBookingLink: input.hasBookingLink,
    socialCount: input.socialProfilesCount,
  });

  const recommendedSolution = recommendWebsiteType(
    input.category,
    input.websiteStatus
  );

  return {
    leadScore,
    starRating,
    purchaseProbability,
    aiConfidence,
    heatScore,
    breakdown,
    opportunityTypes,
    recommendedSolution,
  };
}

/**
 * Helper to build ScoringInput from a Lead + related entities.
 * Useful in API routes and UI.
 */
export function buildScoringInputFromLead(data: {
  websiteStatus: string;
  websiteQualityScore: number | null;
  googleRating: number | null;
  reviewCount: number;
  category?: string | null;
  yearEstablished?: number | null;
  estimatedEmployees?: number | null;
  socialProfiles?: Array<{ platform: string }>;
  hasPhone: boolean;
  hasEmail: boolean;
  hasWhatsApp: boolean;
  hasBookingLink: boolean;
}): ScoringInput {
  const socials = data.socialProfiles || [];
  const platforms = socials.map((s) => s.platform.toLowerCase());

  return {
    websiteStatus: data.websiteStatus as any,
    websiteQualityScore: data.websiteQualityScore,
    hasWebsite: data.websiteStatus !== 'no_website',
    googleRating: data.googleRating,
    reviewCount: data.reviewCount,
    estimatedEmployees: data.estimatedEmployees,
    yearEstablished: data.yearEstablished,
    category: data.category,
    socialProfilesCount: socials.length,
    hasInstagram: platforms.includes('instagram'),
    hasFacebook: platforms.includes('facebook'),
    hasLinkedIn: platforms.includes('linkedin'),
    hasActiveSocial: socials.length > 0,
    hasPhone: data.hasPhone,
    hasEmail: data.hasEmail,
    hasWhatsApp: data.hasWhatsApp,
    hasBookingLink: data.hasBookingLink,
  };
}
