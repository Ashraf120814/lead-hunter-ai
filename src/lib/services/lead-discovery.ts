// =============================================================================
// Lead Discovery Service — Orchestrates the full FIND → ANALYZE → QUALIFY pipeline
// =============================================================================

import { getProviders } from '@/lib/providers';
import { calculateLeadScore, buildScoringInputFromLead } from '@/lib/scoring';
import { agents } from '@/lib/ai';
import type {
  SearchFilters,
  Lead,
  Business,
  Contact,
  SocialProfile,
  WebsiteAudit,
  ScoringResult,
  WebsiteStatus,
} from '@/types';
import type { RawBusiness, WebsiteAuditResult } from '@/lib/providers/types';

export interface DiscoveredLead {
  // Temporary in-memory shape before persistence
  business: Business;
  contact: Contact | null;
  socialProfiles: SocialProfile[];
  audit: WebsiteAudit;
  scoring: ScoringResult;
  aiSummary: string;
  websitePrompt: string;
  recommendedSolution: string;
  opportunityTypes: string[];
}

export interface DiscoveryProgress {
  stage: string;
  percent: number;
  message: string;
  processed: number;
  total: number;
}

export type ProgressCallback = (progress: DiscoveryProgress) => void;

/**
 * Run the complete discovery pipeline for a set of filters.
 * Returns fully analyzed leads ready for display / persistence.
 */
export async function discoverLeads(
  filters: SearchFilters,
  options: {
    limit?: number;
    onProgress?: ProgressCallback;
  } = {}
): Promise<DiscoveredLead[]> {
  const { limit = 20, onProgress } = options;
  const providers = getProviders();

  const report = (stage: string, percent: number, message: string, processed = 0, total = 0) => {
    onProgress?.({ stage, percent, message, processed, total });
  };

  // 1. Search businesses
  report('searching', 5, 'Searching businesses...');
  const { businesses: rawBusinesses } = await providers.maps.searchBusinesses(filters, { limit });

  if (rawBusinesses.length === 0) {
    report('completed', 100, 'No businesses found.');
    return [];
  }

  report('searching', 15, `Found ${rawBusinesses.length} businesses. Analyzing...`, 0, rawBusinesses.length);

  const results: DiscoveredLead[] = [];

  for (let i = 0; i < rawBusinesses.length; i++) {
    const raw = rawBusinesses[i];
    const progressBase = 15 + Math.round((i / rawBusinesses.length) * 75);

    report('analyzing', progressBase, `Analyzing ${raw.name}...`, i + 1, rawBusinesses.length);

    try {
      const discovered = await analyzeSingleBusiness(raw, providers);
      results.push(discovered);
    } catch (err) {
      // Never crash the whole search because one business failed
      console.error(`[LeadDiscovery] Failed to analyze ${raw.name}:`, err);
    }
  }

  // Sort by lead score descending
  results.sort((a, b) => b.scoring.leadScore - a.scoring.leadScore);

  report('completed', 100, `Analysis complete. ${results.length} leads ready.`, results.length, results.length);
  return results;
}

/**
 * Full analysis pipeline for a single raw business.
 */
async function analyzeSingleBusiness(
  raw: RawBusiness,
  providers: ReturnType<typeof getProviders>
): Promise<DiscoveredLead> {
  // Normalize business
  const business = mapRawToBusiness(raw);

  // Parallel enrichment
  const [contactRaw, socialRaw, auditRaw] = await Promise.all([
    providers.contact.findContacts(raw.name, raw.website, raw.city ?? undefined),
    providers.social.findProfiles(raw.name, raw.city ?? undefined, raw.website),
    raw.website
      ? providers.websiteAudit.audit(raw.website)
      : providers.websiteAudit.audit(''), // triggers no_website result
  ]);

  let contact = contactRaw ? mapRawToContact(contactRaw, business.id) : null;
  // Merge verified phone from Google Places (never invent)
  if (raw.phone) {
    if (contact) {
      contact = { ...contact, phone: contact.phone || raw.phone };
    } else {
      contact = {
        id: generateTempId(),
        business_id: business.id,
        phone: raw.phone,
        alternate_phones: null,
        email: null,
        alternate_emails: null,
        contact_page_url: null,
        booking_url: null,
        whatsapp: null,
        source: 'google_places',
        is_verified: true,
        verified_at: new Date().toISOString(),
      };
    }
  }
  const socialProfiles = (socialRaw || []).map((s, idx) => mapRawToSocial(s, business.id, idx));
  const audit = mapAuditResult(auditRaw, business.id, raw.website);

  // Scoring
  const scoringInput = buildScoringInputFromLead({
    websiteStatus: audit.status,
    websiteQualityScore: audit.quality_score,
    googleRating: business.google_rating,
    reviewCount: business.review_count,
    category: business.category,
    yearEstablished: business.year_established,
    estimatedEmployees: business.estimated_employees_min,
    socialProfiles: socialProfiles.map((s) => ({ platform: s.platform })),
    hasPhone: !!(contact?.phone || raw.phone),
    hasEmail: !!contact?.email,
    hasWhatsApp: !!contact?.whatsapp,
    hasBookingLink: !!contact?.booking_url,
  });

  const scoring = calculateLeadScore(scoringInput);

  // AI agents
  const ctx = {
    business,
    contact,
    socialProfiles,
    audit,
    scoring,
  };

  const [summaryResult, promptResult] = await Promise.all([
    agents.qualification.generateSummary(ctx),
    agents.websiteStrategy.generateWebsitePrompt(ctx),
  ]);

  return {
    business,
    contact,
    socialProfiles,
    audit,
    scoring,
    aiSummary: summaryResult.summary,
    websitePrompt: promptResult.prompt,
    recommendedSolution: summaryResult.recommendedSolution,
    opportunityTypes: summaryResult.opportunityTypes,
  };
}

// ---------- Mappers (Raw → Domain) ----------

function generateTempId(): string {
  return `temp_${Math.random().toString(36).slice(2, 11)}`;
}

function mapRawToBusiness(raw: RawBusiness): Business {
  return {
    id: generateTempId(),
    external_id: raw.externalId,
    provider: raw.provider,
    name: raw.name,
    category: raw.category ?? null,
    subcategory: raw.subcategory ?? null,
    description: raw.description ?? null,
    address: raw.address ?? null,
    city: raw.city ?? null,
    state: raw.state ?? null,
    country: raw.country ?? null,
    postal_code: raw.postalCode ?? null,
    latitude: raw.latitude ?? null,
    longitude: raw.longitude ?? null,
    google_maps_url: raw.googleMapsUrl ?? null,
    business_hours: raw.businessHours ?? null,
    business_status: raw.businessStatus ?? null,
    year_established: raw.yearEstablished ?? null,
    estimated_employees_min: null,
    estimated_employees_max: null,
    estimated_revenue_min: null,
    estimated_revenue_max: null,
    google_rating: raw.googleRating ?? null,
    review_count: raw.reviewCount ?? 0,
    language: null,
    is_verified: false,
    last_verified_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

function mapRawToContact(raw: any, businessId: string): Contact {
  return {
    id: generateTempId(),
    business_id: businessId,
    phone: raw.phone ?? null,
    alternate_phones: raw.alternatePhones ?? null,
    email: raw.email ?? null,
    alternate_emails: raw.alternateEmails ?? null,
    contact_page_url: raw.contactPageUrl ?? null,
    booking_url: raw.bookingUrl ?? null,
    whatsapp: raw.whatsapp ?? null,
    source: raw.source ?? null,
    is_verified: false,
    verified_at: null,
  };
}

function mapRawToSocial(raw: any, businessId: string, idx: number): SocialProfile {
  return {
    id: `temp_social_${idx}_${generateTempId()}`,
    business_id: businessId,
    platform: raw.platform,
    url: raw.url,
    username: raw.username ?? null,
    followers_count: raw.followersCount ?? null,
    is_verified: raw.isVerified ?? false,
    last_checked_at: null,
  };
}

function mapAuditResult(
  raw: WebsiteAuditResult | null,
  businessId: string,
  websiteUrl?: string | null
): WebsiteAudit {
  if (!raw) {
    return {
      id: generateTempId(),
      business_id: businessId,
      website_url: websiteUrl ?? null,
      status: websiteUrl ? 'exists' : 'no_website',
      quality_score: null,
      audit_status: 'failed',
      is_https: null,
      is_mobile_responsive: null,
      page_speed_score: null,
      core_web_vitals: null,
      seo_score: null,
      accessibility_score: null,
      ui_ux_score: null,
      modernity_score: null,
      conversion_score: null,
      has_broken_links: null,
      has_ssl: null,
      technologies: null,
      weaknesses: [],
      strengths: [],
      missing_pages: null,
      audited_at: new Date().toISOString(),
    };
  }

  return {
    id: generateTempId(),
    business_id: businessId,
    website_url: raw.url || websiteUrl || null,
    status: raw.status as WebsiteStatus,
    quality_score: raw.qualityScore,
    audit_status: 'completed',
    is_https: raw.isHttps,
    is_mobile_responsive: raw.isMobileResponsive,
    page_speed_score: raw.pageSpeedScore,
    core_web_vitals: raw.coreWebVitals,
    seo_score: raw.seoScore,
    accessibility_score: raw.accessibilityScore,
    ui_ux_score: raw.uiUxScore,
    modernity_score: raw.modernityScore,
    conversion_score: raw.conversionScore,
    has_broken_links: raw.hasBrokenLinks,
    has_ssl: raw.hasSsl,
    technologies: raw.technologies,
    weaknesses: raw.weaknesses,
    strengths: raw.strengths,
    missing_pages: raw.missingPages,
    audited_at: new Date().toISOString(),
  };
}

/**
 * Convert a DiscoveredLead into a partial Lead shape for CRM / UI.
 */
export function toLeadShape(
  discovered: DiscoveredLead,
  userId: string,
  searchId?: string
): Partial<Lead> {
  return {
    user_id: userId,
    business_id: discovered.business.id,
    search_id: searchId ?? null,
    lead_score: discovered.scoring.leadScore,
    star_rating: discovered.scoring.starRating,
    purchase_probability: discovered.scoring.purchaseProbability,
    ai_confidence: discovered.scoring.aiConfidence,
    heat_score: discovered.scoring.heatScore,
    score_breakdown: discovered.scoring.breakdown,
    ai_summary: discovered.aiSummary,
    recommended_solution: discovered.recommendedSolution,
    opportunity_types: discovered.scoring.opportunityTypes,
    website_recommendation: discovered.recommendedSolution,
    website_prompt: discovered.websitePrompt,
    status: 'new',
    is_favorite: false,
    is_archived: false,
    tags: [],
    notes: null,
    follow_up_date: null,
    last_contacted_at: null,
    deal_value_cents: null,
    source: 'search',
  };
}
