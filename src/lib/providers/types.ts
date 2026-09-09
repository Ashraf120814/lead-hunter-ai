// =============================================================================
// Lead Hunter AI — Provider Abstraction Types
// All external data sources implement these interfaces so they can be swapped.
// =============================================================================

import type { SearchFilters, LocationFilter, WebsiteStatus } from '@/types';

// ---------- Raw shapes returned by external providers ----------

export interface RawBusiness {
  externalId: string;
  provider: string;
  name: string;
  category?: string | null;
  subcategory?: string | null;
  description?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  postalCode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  googleMapsUrl?: string | null;
  businessHours?: Record<string, string> | null;
  businessStatus?: string | null;
  yearEstablished?: number | null;
  googleRating?: number | null;
  reviewCount?: number;
  phone?: string | null;
  website?: string | null;
  raw?: Record<string, unknown>;
}

export interface RawContact {
  phone?: string | null;
  alternatePhones?: string[];
  email?: string | null;
  alternateEmails?: string[];
  contactPageUrl?: string | null;
  bookingUrl?: string | null;
  whatsapp?: string | null;
  source?: string;
}

export interface RawSocialProfile {
  platform: string;
  url: string;
  username?: string | null;
  followersCount?: number | null;
  isVerified?: boolean;
}

export interface WebsiteAuditResult {
  url: string;
  status: WebsiteStatus;
  qualityScore: number | null; // 0-100
  isHttps: boolean | null;
  isMobileResponsive: boolean | null;
  pageSpeedScore: number | null;
  coreWebVitals: Record<string, number> | null;
  seoScore: number | null;
  accessibilityScore: number | null;
  uiUxScore: number | null;
  modernityScore: number | null;
  conversionScore: number | null;
  hasBrokenLinks: boolean | null;
  hasSsl: boolean | null;
  technologies: string[];
  weaknesses: Array<{
    issue: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
  }>;
  strengths: Array<{
    item: string;
    description: string;
  }>;
  missingPages: string[];
  raw?: Record<string, unknown>;
}

// ---------- Provider Interfaces ----------

export interface MapsProvider {
  readonly name: string;

  /**
   * Search for businesses matching filters.
   * Must respect rate limits and never fabricate data.
   */
  searchBusinesses(
    filters: SearchFilters,
    options?: { limit?: number; pageToken?: string }
  ): Promise<{
    businesses: RawBusiness[];
    nextPageToken?: string;
    totalEstimated?: number;
  }>;

  /**
   * Fetch detailed place information by external ID.
   */
  getPlaceDetails(externalId: string): Promise<RawBusiness | null>;

  /**
   * Optional: geocode a free-text location.
   */
  geocode?(query: string): Promise<LocationFilter | null>;
}

export interface WebsiteAuditProvider {
  readonly name: string;

  /**
   * Audit a website URL.
   * Returns null if the site cannot be reached or analysis fails.
   */
  audit(url: string): Promise<WebsiteAuditResult | null>;

  /**
   * Quick check: does a website exist / respond?
   */
  checkExists?(url: string): Promise<boolean>;
}

export interface SocialDiscoveryProvider {
  readonly name: string;

  /**
   * Find public social profiles for a business.
   * Never invent URLs.
   */
  findProfiles(
    businessName: string,
    location?: string,
    website?: string | null
  ): Promise<RawSocialProfile[]>;
}

export interface ContactDiscoveryProvider {
  readonly name: string;

  /**
   * Discover publicly available contact information.
   * Must not fabricate emails or phone numbers.
   */
  findContacts(
    businessName: string,
    website?: string | null,
    location?: string
  ): Promise<RawContact | null>;
}

export interface EmailValidationProvider {
  readonly name: string;
  validate(email: string): Promise<{ valid: boolean; reason?: string }>;
}

// ---------- Registry ----------

export interface ProviderRegistry {
  maps: MapsProvider;
  websiteAudit: WebsiteAuditProvider;
  social: SocialDiscoveryProvider;
  contact: ContactDiscoveryProvider;
  emailValidation?: EmailValidationProvider;
}
