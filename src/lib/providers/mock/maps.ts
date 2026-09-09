// =============================================================================
// Mock Maps Provider — realistic sample data for development & demos
// Replace with Google Places / SerpAPI / OSM in production.
// =============================================================================

import type { MapsProvider, RawBusiness } from '../types';
import type { SearchFilters } from '@/types';

const SAMPLE_BUSINESSES: RawBusiness[] = [
  {
    externalId: 'mock_jew_001',
    provider: 'mock',
    name: 'Al Noor Jewellery',
    category: 'Jewellery Store',
    subcategory: 'Fine Jewellery',
    description: 'Premium gold and diamond jewellery retailer serving Dubai for over 15 years.',
    address: 'Gold Souk, Deira',
    city: 'Dubai',
    state: 'Dubai',
    country: 'United Arab Emirates',
    postalCode: '00000',
    latitude: 25.2697,
    longitude: 55.2962,
    googleMapsUrl: 'https://maps.google.com/?q=Al+Noor+Jewellery+Dubai',
    googleRating: 4.7,
    reviewCount: 843,
    phone: '+971 4 123 4567',
    website: null, // no website
    businessStatus: 'operational',
    yearEstablished: 2008,
  },
  {
    externalId: 'mock_rest_001',
    provider: 'mock',
    name: 'Bella Cucina Trattoria',
    category: 'Restaurant',
    subcategory: 'Italian',
    description: 'Authentic Italian trattoria in downtown Chicago.',
    address: '214 W Ontario St',
    city: 'Chicago',
    state: 'Illinois',
    country: 'United States',
    postalCode: '60654',
    latitude: 41.8932,
    longitude: -87.6335,
    googleMapsUrl: 'https://maps.google.com/?q=Bella+Cucina+Chicago',
    googleRating: 4.6,
    reviewCount: 512,
    phone: '+1 312-555-0198',
    website: 'http://bellacucina-chicago.example.com', // outdated
    businessStatus: 'operational',
    yearEstablished: 2012,
  },
  {
    externalId: 'mock_dent_001',
    provider: 'mock',
    name: 'Harley Street Dental Studio',
    category: 'Dentist',
    subcategory: 'General Dentistry',
    description: 'Private dental practice on Harley Street.',
    address: '45 Harley Street',
    city: 'London',
    state: 'England',
    country: 'United Kingdom',
    postalCode: 'W1G 8QT',
    latitude: 51.5205,
    longitude: -0.1478,
    googleMapsUrl: 'https://maps.google.com/?q=Harley+Street+Dental',
    googleRating: 4.9,
    reviewCount: 327,
    phone: '+44 20 7123 4567',
    website: null,
    businessStatus: 'operational',
    yearEstablished: 2005,
  },
  {
    externalId: 'mock_salon_001',
    provider: 'mock',
    name: 'Glow Beauty Lounge',
    category: 'Beauty Salon',
    subcategory: 'Hair & Beauty',
    description: 'Upscale salon specializing in color and keratin treatments.',
    address: '88 Robertson Blvd',
    city: 'Los Angeles',
    state: 'California',
    country: 'United States',
    postalCode: '90035',
    latitude: 34.0822,
    longitude: -118.3837,
    googleRating: 4.5,
    reviewCount: 189,
    phone: '+1 310-555-0142',
    website: 'https://glowbeautylounge.example.com',
    businessStatus: 'operational',
    yearEstablished: 2018,
  },
  {
    externalId: 'mock_auto_001',
    provider: 'mock',
    name: 'Precision Auto Care',
    category: 'Auto Repair',
    subcategory: 'Car Service',
    description: 'Full-service auto repair and detailing.',
    address: '1520 Broadway',
    city: 'New York',
    state: 'New York',
    country: 'United States',
    postalCode: '10036',
    latitude: 40.7580,
    longitude: -73.9855,
    googleRating: 4.4,
    reviewCount: 276,
    phone: '+1 212-555-0177',
    website: null,
    businessStatus: 'operational',
    yearEstablished: 1999,
  },
  {
    externalId: 'mock_cafe_001',
    provider: 'mock',
    name: 'Morning Brew Café',
    category: 'Cafe',
    subcategory: 'Coffee Shop',
    description: 'Specialty coffee and brunch spot.',
    address: '12 King Street',
    city: 'Toronto',
    state: 'Ontario',
    country: 'Canada',
    postalCode: 'M5H 1A1',
    latitude: 43.6481,
    longitude: -79.3773,
    googleRating: 4.3,
    reviewCount: 94,
    phone: '+1 416-555-0133',
    website: 'http://morningbrew-to.example.com',
    businessStatus: 'operational',
    yearEstablished: 2019,
  },
  {
    externalId: 'mock_jew_002',
    provider: 'mock',
    name: 'Royal Diamond House',
    category: 'Jewellery Store',
    subcategory: 'Diamond Jewellery',
    description: 'High-end diamond and bridal jewellery.',
    address: 'Sheikh Zayed Road',
    city: 'Dubai',
    state: 'Dubai',
    country: 'United Arab Emirates',
    postalCode: '00000',
    latitude: 25.2048,
    longitude: 55.2708,
    googleRating: 4.8,
    reviewCount: 1204,
    phone: '+971 4 987 6543',
    website: 'https://royaldiamondhouse.example.com',
    businessStatus: 'operational',
    yearEstablished: 2001,
  },
  {
    externalId: 'mock_clinic_001',
    provider: 'mock',
    name: 'Wellness Family Clinic',
    category: 'Medical Clinic',
    subcategory: 'Family Medicine',
    description: 'Family practice serving the local community.',
    address: '300 Market St',
    city: 'San Francisco',
    state: 'California',
    country: 'United States',
    postalCode: '94105',
    latitude: 37.7897,
    longitude: -122.3972,
    googleRating: 4.6,
    reviewCount: 412,
    phone: '+1 415-555-0190',
    website: null,
    businessStatus: 'operational',
    yearEstablished: 2010,
  },
];

function matchesFilters(b: RawBusiness, filters: SearchFilters): boolean {
  const loc = filters.location;
  if (loc) {
    if (loc.country && b.country && !b.country.toLowerCase().includes(loc.country.toLowerCase())) {
      return false;
    }
    if (loc.state && b.state && !b.state.toLowerCase().includes(loc.state.toLowerCase())) {
      return false;
    }
    if (loc.city && b.city && !b.city.toLowerCase().includes(loc.city.toLowerCase())) {
      return false;
    }
  }

  if (filters.category || filters.industry) {
    const target = (filters.category || filters.industry || '').toLowerCase();
    const cat = (b.category || '').toLowerCase();
    if (!cat.includes(target) && !target.includes(cat.split(' ')[0])) {
      // loose match
      if (!cat.includes(target.slice(0, 4))) return false;
    }
  }

  if (filters.rating_min !== undefined && (b.googleRating ?? 0) < filters.rating_min) {
    return false;
  }
  if (filters.reviews_min !== undefined && (b.reviewCount ?? 0) < filters.reviews_min) {
    return false;
  }

  if (filters.website_status) {
    const statuses = Array.isArray(filters.website_status)
      ? filters.website_status
      : [filters.website_status];
    const hasWebsite = !!b.website;
    if (statuses.includes('no_website') && hasWebsite) return false;
    if (statuses.includes('exists') && !hasWebsite) return false;
  }

  return true;
}

export const mockMapsProvider: MapsProvider = {
  name: 'mock-maps',

  async searchBusinesses(filters, options = {}) {
    const limit = options.limit ?? 20;
    let results = SAMPLE_BUSINESSES.filter((b) => matchesFilters(b, filters));

    // If no filters match anything, return a sensible subset
    if (results.length === 0) {
      results = SAMPLE_BUSINESSES.slice(0, limit);
    }

    return {
      businesses: results.slice(0, limit),
      totalEstimated: results.length,
    };
  },

  async getPlaceDetails(externalId) {
    return SAMPLE_BUSINESSES.find((b) => b.externalId === externalId) ?? null;
  },

  async geocode(query) {
    // Extremely simplified
    const q = query.toLowerCase();
    if (q.includes('dubai')) {
      return { country: 'United Arab Emirates', city: 'Dubai', latitude: 25.2048, longitude: 55.2708 };
    }
    if (q.includes('chicago')) {
      return { country: 'United States', state: 'Illinois', city: 'Chicago', latitude: 41.8781, longitude: -87.6298 };
    }
    if (q.includes('london')) {
      return { country: 'United Kingdom', city: 'London', latitude: 51.5074, longitude: -0.1278 };
    }
    return null;
  },
};
