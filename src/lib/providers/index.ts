// =============================================================================
// Provider Registry
// Uses REAL providers when API keys are present; otherwise mock for local UI work.
// =============================================================================

import type { ProviderRegistry } from './types';
import { mockMapsProvider } from './mock/maps';
import { mockWebsiteAuditProvider } from './mock/audit';
import { mockSocialProvider } from './mock/social';
import { mockContactProvider } from './mock/contact';
import { createGooglePlacesProvider, isGooglePlacesConfigured } from './google-places';
import { realWebsiteAuditProvider } from './website-audit-real';
import { placeContactProvider } from './contact-from-place';

/**
 * Active providers:
 * - Maps: Google Places when GOOGLE_MAPS_API_KEY is set and USE_MOCK_PROVIDERS is not true
 * - Website audit: real HTTP + optional PageSpeed
 * - Social: mock until a licensed API is configured (do not invent profiles)
 * - Contact: no fabricated emails; phone comes from Google Places on the business
 */
export function getProviders(): ProviderRegistry {
  const useGoogle =
    isGooglePlacesConfigured() && process.env.USE_MOCK_PROVIDERS !== 'true';

  if (useGoogle) {
    return {
      maps: createGooglePlacesProvider(),
      websiteAudit: realWebsiteAuditProvider,
      social: mockSocialProvider,
      contact: placeContactProvider,
    };
  }

  // Default: mock (safe for UI development)
  if (process.env.USE_MOCK_PROVIDERS !== 'false') {
    return {
      maps: mockMapsProvider,
      websiteAudit: mockWebsiteAuditProvider,
      social: mockSocialProvider,
      contact: mockContactProvider,
    };
  }

  // Forced real mode without key → Google provider still used (clear error on call)
  return {
    maps: createGooglePlacesProvider(),
    websiteAudit: realWebsiteAuditProvider,
    social: mockSocialProvider,
    contact: placeContactProvider,
  };
}

export * from './types';
export { mockMapsProvider } from './mock/maps';
export { mockWebsiteAuditProvider } from './mock/audit';
export { mockSocialProvider } from './mock/social';
export { mockContactProvider } from './mock/contact';
export { createGooglePlacesProvider, isGooglePlacesConfigured } from './google-places';
export { realWebsiteAuditProvider } from './website-audit-real';
