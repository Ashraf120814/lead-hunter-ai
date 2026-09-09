// =============================================================================
// Natural Language → Structured Filters Parser
// Simple rule-based for reliability. Can be upgraded with LLM later.
// =============================================================================

import type { SearchFilters, WebsiteStatus } from '@/types';
import type { NaturalLanguageSearchResult } from '@/types';

const COUNTRY_ALIASES: Record<string, string> = {
  usa: 'United States',
  us: 'United States',
  'united states': 'United States',
  uae: 'United Arab Emirates',
  dubai: 'United Arab Emirates', // city handled separately
  uk: 'United Kingdom',
  'united kingdom': 'United Kingdom',
  britain: 'United Kingdom',
  canada: 'Canada',
  australia: 'Australia',
  india: 'India',
  singapore: 'Singapore',
};

const CITY_COUNTRY: Record<string, { city: string; country: string; state?: string }> = {
  chicago: { city: 'Chicago', country: 'United States', state: 'Illinois' },
  'los angeles': { city: 'Los Angeles', country: 'United States', state: 'California' },
  'new york': { city: 'New York', country: 'United States', state: 'New York' },
  'san francisco': { city: 'San Francisco', country: 'United States', state: 'California' },
  london: { city: 'London', country: 'United Kingdom' },
  dubai: { city: 'Dubai', country: 'United Arab Emirates' },
  toronto: { city: 'Toronto', country: 'Canada', state: 'Ontario' },
  mumbai: { city: 'Mumbai', country: 'India', state: 'Maharashtra' },
  delhi: { city: 'Delhi', country: 'India' },
  singapore: { city: 'Singapore', country: 'Singapore' },
  sydney: { city: 'Sydney', country: 'Australia', state: 'New South Wales' },
};

const INDUSTRY_KEYWORDS: Record<string, string> = {
  restaurant: 'Restaurant',
  restaurants: 'Restaurant',
  cafe: 'Cafe',
  coffee: 'Cafe',
  jewellery: 'Jewellery Store',
  jewelry: 'Jewellery Store',
  jeweller: 'Jewellery Store',
  dentist: 'Dentist',
  dental: 'Dentist',
  clinic: 'Medical Clinic',
  salon: 'Beauty Salon',
  spa: 'Beauty Salon',
  hotel: 'Hotel',
  'auto repair': 'Auto Repair',
  garage: 'Auto Repair',
  lawyer: 'Lawyer',
  attorney: 'Lawyer',
  gym: 'Fitness',
  fitness: 'Fitness',
};

/**
 * Parse a natural language query into structured SearchFilters.
 * Examples:
 *  "Find restaurants in Chicago without websites"
 *  "Find jewellery stores in Dubai with outdated websites"
 *  "Find dentists in London with websites older than 5 years"
 *  "Find businesses in California with Google ratings above 4 stars but poor websites"
 */
export function parseNaturalLanguageQuery(query: string): NaturalLanguageSearchResult {
  const q = query.toLowerCase().trim();
  const filters: SearchFilters = {};
  let confidence = 0.5;

  // --- Location ---
  for (const [key, loc] of Object.entries(CITY_COUNTRY)) {
    if (q.includes(key)) {
      filters.location = {
        city: loc.city,
        country: loc.country,
        state: loc.state,
      };
      confidence += 0.15;
      break;
    }
  }

  if (!filters.location) {
    for (const [alias, country] of Object.entries(COUNTRY_ALIASES)) {
      if (q.includes(alias)) {
        filters.location = { country };
        // Special case: "California"
        if (q.includes('california')) {
          filters.location.state = 'California';
          filters.location.country = 'United States';
        }
        confidence += 0.1;
        break;
      }
    }
  }

  if (q.includes('california') && !filters.location?.state) {
    filters.location = {
      ...(filters.location || {}),
      state: 'California',
      country: 'United States',
    };
    confidence += 0.1;
  }

  // --- Industry / Category ---
  for (const [keyword, category] of Object.entries(INDUSTRY_KEYWORDS)) {
    if (q.includes(keyword)) {
      filters.category = category;
      filters.industry = category;
      confidence += 0.15;
      break;
    }
  }

  // --- Website status ---
  if (
    q.includes('without website') ||
    q.includes('no website') ||
    q.includes('dont have a website') ||
    q.includes("don't have a website") ||
    q.includes('lacks a website')
  ) {
    filters.website_status = 'no_website';
    confidence += 0.2;
  } else if (
    q.includes('outdated website') ||
    q.includes('old website') ||
    q.includes('websites older') ||
    q.includes('poor website') ||
    q.includes('weak website') ||
    q.includes('bad website')
  ) {
    filters.website_status = ['poor', 'outdated', 'broken'] as WebsiteStatus[];
    filters.website_quality_max = 50;
    confidence += 0.15;
  } else if (q.includes('with websites') || q.includes('have websites')) {
    filters.website_status = 'exists';
    confidence += 0.05;
  }

  // --- Rating ---
  const ratingMatch = q.match(/(?:rating|ratings|stars?)\s*(?:above|over|more than|>=?)\s*(\d(?:\.\d)?)/);
  if (ratingMatch) {
    filters.rating_min = parseFloat(ratingMatch[1]);
    confidence += 0.1;
  } else if (q.includes('above 4') || q.includes('over 4') || q.includes('4 stars') || q.includes('4+')) {
    filters.rating_min = 4.0;
    confidence += 0.1;
  }

  // --- Reviews ---
  const reviewsMatch = q.match(/(?:more than|over|above|>)\s*(\d+)\s*(?:reviews?)/);
  if (reviewsMatch) {
    filters.reviews_min = parseInt(reviewsMatch[1], 10);
    confidence += 0.1;
  } else if (q.includes('500 reviews') || q.includes('500+')) {
    filters.reviews_min = 500;
    confidence += 0.1;
  } else if (q.includes('100 reviews') || q.includes('100+')) {
    filters.reviews_min = 100;
    confidence += 0.05;
  }

  // --- Purchase / lead score hints ---
  if (q.includes('high-value') || q.includes('high value') || q.includes('likely to purchase') || q.includes('most likely')) {
    filters.lead_score_min = 70;
    filters.purchase_probability_min = 70;
    confidence += 0.1;
  }

  // --- Social ---
  if (q.includes('strong instagram') || q.includes('active social') || q.includes('instagram presence')) {
    filters.social_presence = true;
    confidence += 0.05;
  }

  // Clamp confidence
  confidence = Math.min(0.95, Math.max(0.3, confidence));

  return {
    filters,
    interpretedQuery: buildInterpretedQuery(filters),
    confidence,
  };
}

function buildInterpretedQuery(filters: SearchFilters): string {
  const parts: string[] = ['Find'];

  if (filters.category || filters.industry) {
    parts.push((filters.category || filters.industry)!.toLowerCase() + 's');
  } else {
    parts.push('businesses');
  }

  if (filters.location) {
    const loc = filters.location;
    const locParts = [loc.city, loc.state, loc.country].filter(Boolean);
    if (locParts.length) parts.push('in ' + locParts.join(', '));
  }

  if (filters.website_status === 'no_website') {
    parts.push('without websites');
  } else if (Array.isArray(filters.website_status)) {
    parts.push('with poor or outdated websites');
  }

  if (filters.rating_min) {
    parts.push(`with rating ≥ ${filters.rating_min}`);
  }
  if (filters.reviews_min) {
    parts.push(`with ≥ ${filters.reviews_min} reviews`);
  }
  if (filters.lead_score_min) {
    parts.push(`(high commercial potential)`);
  }

  return parts.join(' ');
}
