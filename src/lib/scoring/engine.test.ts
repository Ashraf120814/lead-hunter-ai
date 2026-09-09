/**
 * Simple verification of the scoring engine.
 * Run with: npx tsx src/lib/scoring/engine.test.ts
 * (or integrate with Vitest/Jest later)
 */

import { calculateLeadScore, buildScoringInputFromLead } from './engine';
import { DEFAULT_SCORING_WEIGHTS } from './config';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error('❌ FAIL:', message);
    process.exit(1);
  }
  console.log('✅', message);
}

console.log('\n=== Lead Hunter AI — Scoring Engine Tests ===\n');

// Test 1: No website + strong business = high score
const highPotential = calculateLeadScore({
  websiteStatus: 'no_website',
  websiteQualityScore: null,
  hasWebsite: false,
  googleRating: 4.8,
  reviewCount: 320,
  category: 'Jewellery',
  socialProfilesCount: 2,
  hasInstagram: true,
  hasFacebook: true,
  hasLinkedIn: false,
  hasActiveSocial: true,
  hasPhone: true,
  hasEmail: true,
  hasWhatsApp: true,
  hasBookingLink: false,
  estimatedEmployees: 8,
  yearEstablished: 2015,
});

assert(highPotential.leadScore >= 85, `High potential score >= 85 (got ${highPotential.leadScore})`);
assert(highPotential.starRating === 5, `Star rating 5 (got ${highPotential.starRating})`);
assert(highPotential.heatScore === 'very_hot', `Heat very_hot (got ${highPotential.heatScore})`);
assert(highPotential.purchaseProbability >= 75, `Purchase prob >= 75 (got ${highPotential.purchaseProbability})`);
assert(highPotential.breakdown.total === highPotential.leadScore, 'Breakdown total matches leadScore');
console.log('   Score breakdown:', highPotential.breakdown);
console.log('   Opportunities:', highPotential.opportunityTypes);
console.log('   Recommendation:', highPotential.recommendedSolution);

// Test 2: Excellent modern website + weak business = low score
const lowPotential = calculateLeadScore({
  websiteStatus: 'excellent',
  websiteQualityScore: 92,
  hasWebsite: true,
  googleRating: 3.2,
  reviewCount: 4,
  category: 'Consulting',
  socialProfilesCount: 0,
  hasInstagram: false,
  hasFacebook: false,
  hasLinkedIn: false,
  hasActiveSocial: false,
  hasPhone: false,
  hasEmail: false,
  hasWhatsApp: false,
  hasBookingLink: false,
});

assert(lowPotential.leadScore <= 40, `Low potential score <= 40 (got ${lowPotential.leadScore})`);
assert(lowPotential.starRating <= 2, `Star rating <= 2 (got ${lowPotential.starRating})`);
assert(lowPotential.heatScore === 'cold', `Heat cold (got ${lowPotential.heatScore})`);

// Test 3: Weights are respected
const customWeights = {
  website_opportunity: 40,
  business_strength: 20,
  online_activity: 10,
  contactability: 15,
  purchase_signals: 15,
};

const customResult = calculateLeadScore(
  {
    websiteStatus: 'no_website',
    websiteQualityScore: null,
    hasWebsite: false,
    googleRating: 4.0,
    reviewCount: 50,
    socialProfilesCount: 1,
    hasInstagram: true,
    hasFacebook: false,
    hasLinkedIn: false,
    hasActiveSocial: true,
    hasPhone: true,
    hasEmail: false,
    hasWhatsApp: false,
    hasBookingLink: false,
  },
  customWeights
);

assert(
  customResult.breakdown.website_opportunity >= 30,
  `Custom weight increases website opportunity (got ${customResult.breakdown.website_opportunity})`
);

// Test 4: Helper builder
const input = buildScoringInputFromLead({
  websiteStatus: 'poor',
  websiteQualityScore: 28,
  googleRating: 4.6,
  reviewCount: 180,
  category: 'Dental Clinic',
  socialProfiles: [{ platform: 'instagram' }, { platform: 'facebook' }],
  hasPhone: true,
  hasEmail: true,
  hasWhatsApp: false,
  hasBookingLink: false,
});

const fromHelper = calculateLeadScore(input);
assert(fromHelper.leadScore > 60, `Helper-built input produces sensible score (got ${fromHelper.leadScore})`);

console.log('\n=== All scoring tests passed ===\n');
console.log('Default weights:', DEFAULT_SCORING_WEIGHTS);
