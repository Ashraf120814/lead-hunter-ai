// =============================================================================
// Contact provider that only uses verified public fields (e.g. from Google Places)
// Does NOT scrape or invent emails/phones.
// =============================================================================

import type { ContactDiscoveryProvider, RawContact } from './types';

/**
 * Lightweight contact provider.
 * Primary contact data should come from MapsProvider (Google already returns phone).
 * This module only returns null unless you later plug Hunter/Apollo/etc.
 */
export const placeContactProvider: ContactDiscoveryProvider = {
  name: 'place-contact',

  async findContacts(_businessName, website, _location) {
    // Without a dedicated email-finding API we must not invent emails.
    // Website may be used later for a legal, robots-respecting crawl of a public contact page.
    if (!website) {
      return null;
    }

    // Honest: we only know the website exists; email/phone must come from Places or user.
    return {
      phone: null,
      email: null,
      contactPageUrl: website.replace(/\/$/, '') + '/contact',
      source: 'inferred_contact_path',
    } as RawContact;
  },
};
