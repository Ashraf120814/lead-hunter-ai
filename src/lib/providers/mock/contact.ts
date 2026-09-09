// =============================================================================
// Mock Contact Discovery Provider
// Only returns data that would be publicly available. Never fabricates.
// =============================================================================

import type { ContactDiscoveryProvider, RawContact } from '../types';

const KNOWN_CONTACTS: Record<string, RawContact> = {
  'Al Noor Jewellery': {
    phone: '+971 4 123 4567',
    email: null, // not publicly listed
    whatsapp: '+971501234567',
    source: 'google',
  },
  'Bella Cucina Trattoria': {
    phone: '+1 312-555-0198',
    email: 'info@bellacucina-chicago.example.com',
    contactPageUrl: 'http://bellacucina-chicago.example.com/contact',
    source: 'website',
  },
  'Harley Street Dental Studio': {
    phone: '+44 20 7123 4567',
    email: 'reception@harleystreetdental.example.com',
    bookingUrl: 'https://harleystreetdental.example.com/book',
    source: 'directory',
  },
  'Glow Beauty Lounge': {
    phone: '+1 310-555-0142',
    email: 'hello@glowbeautylounge.example.com',
    whatsapp: '+13105550142',
    source: 'website',
  },
  'Precision Auto Care': {
    phone: '+1 212-555-0177',
    email: null,
    source: 'google',
  },
  'Morning Brew Café': {
    phone: '+1 416-555-0133',
    email: 'hi@morningbrew-to.example.com',
    source: 'website',
  },
  'Royal Diamond House': {
    phone: '+971 4 987 6543',
    email: 'concierge@royaldiamondhouse.example.com',
    whatsapp: '+971509876543',
    contactPageUrl: 'https://royaldiamondhouse.example.com/contact',
    source: 'website',
  },
  'Wellness Family Clinic': {
    phone: '+1 415-555-0190',
    email: 'appointments@wellnessfamily.example.com',
    bookingUrl: 'https://wellnessfamily.example.com/book',
    source: 'directory',
  },
};

export const mockContactProvider: ContactDiscoveryProvider = {
  name: 'mock-contact',

  async findContacts(businessName: string) {
    if (KNOWN_CONTACTS[businessName]) {
      return KNOWN_CONTACTS[businessName];
    }

    const key = Object.keys(KNOWN_CONTACTS).find((k) =>
      k.toLowerCase().includes(businessName.toLowerCase().slice(0, 8))
    );
    if (key) return KNOWN_CONTACTS[key];

    // Honest: not found
    return null;
  },
};
