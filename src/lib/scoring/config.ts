// =============================================================================
// Lead Hunter AI — Scoring Configuration
// Weights are configurable via admin_settings.scoring_weights
// =============================================================================

import type { ScoringWeights, OpportunityType } from '@/types';

export const DEFAULT_SCORING_WEIGHTS: ScoringWeights = {
  website_opportunity: 25,
  business_strength: 25,
  online_activity: 20,
  contactability: 15,
  purchase_signals: 15,
};

// Star rating thresholds based on lead_score
export const STAR_RATING_THRESHOLDS = [
  { minScore: 90, stars: 5, label: 'Extremely High Potential' },
  { minScore: 75, stars: 4, label: 'High Potential' },
  { minScore: 55, stars: 3, label: 'Moderate Potential' },
  { minScore: 35, stars: 2, label: 'Low Potential' },
  { minScore: 0, stars: 1, label: 'Very Low Potential' },
] as const;

// Heat score thresholds
export const HEAT_THRESHOLDS = {
  very_hot: 85, // lead_score
  hot: 70,
  warm: 45,
  cold: 0,
} as const;

// Industries that typically have lower digital maturity (higher website opportunity)
export const LOW_DIGITAL_MATURITY_INDUSTRIES = [
  'restaurant',
  'cafe',
  'bakery',
  'jewellery',
  'jewelry',
  'dental',
  'dentist',
  'clinic',
  'salon',
  'spa',
  'barber',
  'auto repair',
  'garage',
  'plumbing',
  'electrician',
  'construction',
  'real estate',
  'lawyer',
  'attorney',
  'accounting',
  'fitness',
  'gym',
  'yoga',
  'hotel',
  'guesthouse',
  'retail',
  'boutique',
  'florist',
  'pet store',
  'hardware',
];

// Categories that benefit strongly from ecommerce
export const ECOMMERCE_FRIENDLY_CATEGORIES = [
  'jewellery',
  'jewelry',
  'fashion',
  'clothing',
  'boutique',
  'retail',
  'electronics',
  'furniture',
  'home decor',
  'cosmetics',
  'beauty',
  'books',
  'sports',
  'outdoor',
];

// Categories that benefit from booking systems
export const BOOKING_FRIENDLY_CATEGORIES = [
  'restaurant',
  'cafe',
  'dental',
  'dentist',
  'clinic',
  'medical',
  'salon',
  'spa',
  'barber',
  'fitness',
  'gym',
  'yoga',
  'hotel',
  'guesthouse',
  'lawyer',
  'attorney',
  'consulting',
  'photography',
];

export function getStarLabel(stars: number): string {
  const entry = STAR_RATING_THRESHOLDS.find((t) => t.stars === stars);
  return entry?.label ?? 'Unknown';
}

export function getHeatFromScore(score: number): 'very_hot' | 'hot' | 'warm' | 'cold' {
  if (score >= HEAT_THRESHOLDS.very_hot) return 'very_hot';
  if (score >= HEAT_THRESHOLDS.hot) return 'hot';
  if (score >= HEAT_THRESHOLDS.warm) return 'warm';
  return 'cold';
}

export function isLowDigitalMaturity(category?: string | null): boolean {
  if (!category) return false;
  const lower = category.toLowerCase();
  return LOW_DIGITAL_MATURITY_INDUSTRIES.some((ind) => lower.includes(ind));
}

export function suggestOpportunityTypes(input: {
  websiteStatus: string;
  qualityScore: number | null;
  category?: string | null;
  hasBookingLink?: boolean;
  socialCount?: number;
}): OpportunityType[] {
  const types: OpportunityType[] = [];
  const cat = (input.category || '').toLowerCase();

  if (input.websiteStatus === 'no_website') {
    types.push('website');
  } else if (
    input.websiteStatus === 'poor' ||
    input.websiteStatus === 'outdated' ||
    input.websiteStatus === 'broken' ||
    (input.qualityScore !== null && input.qualityScore < 50)
  ) {
    types.push('redesign');
    types.push('website');
  }

  if (ECOMMERCE_FRIENDLY_CATEGORIES.some((c) => cat.includes(c))) {
    types.push('ecommerce');
  }

  if (BOOKING_FRIENDLY_CATEGORIES.some((c) => cat.includes(c)) && !input.hasBookingLink) {
    types.push('booking');
  }

  if (input.qualityScore !== null && input.qualityScore < 60) {
    types.push('seo');
  }

  types.push('ai_chatbot');

  if ((input.socialCount || 0) < 2) {
    // weak social → automation / CRM opportunity
    types.push('automation');
  }

  // Deduplicate
  return [...new Set(types)];
}

export function recommendWebsiteType(category?: string | null, websiteStatus?: string): string {
  const cat = (category || '').toLowerCase();

  if (websiteStatus === 'no_website') {
    if (ECOMMERCE_FRIENDLY_CATEGORIES.some((c) => cat.includes(c))) return 'Ecommerce Website';
    if (BOOKING_FRIENDLY_CATEGORIES.some((c) => cat.includes(c))) return 'Booking Website';
    if (cat.includes('restaurant') || cat.includes('cafe')) return 'Restaurant Website';
    if (cat.includes('hotel') || cat.includes('guesthouse')) return 'Hotel Website';
    if (cat.includes('real estate')) return 'Real Estate Website';
    if (cat.includes('dental') || cat.includes('clinic') || cat.includes('medical'))
      return 'Medical / Clinic Website';
    if (cat.includes('jewellery') || cat.includes('jewelry')) return 'Jewellery Ecommerce';
    return 'Professional Business Website';
  }

  if (ECOMMERCE_FRIENDLY_CATEGORIES.some((c) => cat.includes(c))) {
    return 'Modern Ecommerce Redesign';
  }
  if (BOOKING_FRIENDLY_CATEGORIES.some((c) => cat.includes(c))) {
    return 'Booking-Focused Website Redesign';
  }
  return 'Modern Business Website Redesign';
}
