// =============================================================================
// Google Places API (New) Provider — REAL business data
// Uses: places:searchText + Place Details
// Docs: https://developers.google.com/maps/documentation/places/web-service
// =============================================================================

import type { MapsProvider, RawBusiness } from './types';
import type { SearchFilters, LocationFilter } from '@/types';
import { env } from '@/config/env';

const PLACES_BASE = 'https://places.googleapis.com/v1';

/** Field mask for Text Search (Enterprise-level fields = phone, website, rating) */
const SEARCH_FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.location',
  'places.types',
  'places.primaryType',
  'places.primaryTypeDisplayName',
  'places.rating',
  'places.userRatingCount',
  'places.businessStatus',
  'places.nationalPhoneNumber',
  'places.internationalPhoneNumber',
  'places.websiteUri',
  'places.googleMapsUri',
  'places.regularOpeningHours',
].join(',');

const DETAILS_FIELD_MASK = [
  'id',
  'displayName',
  'formattedAddress',
  'addressComponents',
  'location',
  'types',
  'primaryType',
  'primaryTypeDisplayName',
  'rating',
  'userRatingCount',
  'businessStatus',
  'nationalPhoneNumber',
  'internationalPhoneNumber',
  'websiteUri',
  'googleMapsUri',
  'regularOpeningHours',
  'editorialSummary',
].join(',');

/** Map common category labels → Google place types where useful */
const CATEGORY_TO_TYPES: Record<string, string[]> = {
  restaurant: ['restaurant'],
  cafe: ['cafe', 'coffee_shop'],
  'jewellery store': ['jewelry_store'],
  jewelry: ['jewelry_store'],
  jewellery: ['jewelry_store'],
  dentist: ['dentist'],
  dental: ['dentist'],
  'medical clinic': ['doctor', 'hospital'],
  clinic: ['doctor'],
  'beauty salon': ['beauty_salon', 'hair_care'],
  salon: ['beauty_salon', 'hair_salon'],
  'auto repair': ['car_repair'],
  hotel: ['lodging'],
  lawyer: ['lawyer'],
  gym: ['gym'],
  fitness: ['gym'],
};

function buildTextQuery(filters: SearchFilters): string {
  const parts: string[] = [];

  if (filters.category || filters.industry) {
    parts.push(filters.category || filters.industry || '');
  } else if (filters.keywords?.length) {
    parts.push(filters.keywords.join(' '));
  } else {
    parts.push('businesses');
  }

  const loc = filters.location;
  if (loc) {
    const locParts = [loc.city, loc.state, loc.country, loc.postal_code].filter(Boolean);
    if (locParts.length) parts.push('in ' + locParts.join(', '));
  }

  if (filters.website_status === 'no_website') {
    // API cannot filter "no website" server-side; we filter after fetch
  }

  return parts.filter(Boolean).join(' ').trim() || 'local businesses';
}

function parseAddressComponents(components?: Array<{
  longText?: string;
  shortText?: string;
  types?: string[];
}>): Partial<RawBusiness> {
  if (!components?.length) return {};
  const get = (type: string) =>
    components.find((c) => c.types?.includes(type))?.longText ??
    components.find((c) => c.types?.includes(type))?.shortText;

  return {
    city: get('locality') || get('postal_town') || get('sublocality') || undefined,
    state: get('administrative_area_level_1') || undefined,
    country: get('country') || undefined,
    postalCode: get('postal_code') || undefined,
  };
}

function mapPlaceToRaw(place: any): RawBusiness {
  const id = place.id || place.name?.replace('places/', '') || '';
  const displayName = place.displayName?.text || place.displayName || 'Unknown';
  const addressParts = parseAddressComponents(place.addressComponents);

  // Prefer formatted address parsing if components missing
  let city = addressParts.city;
  let state = addressParts.state;
  let country = addressParts.country;
  let postalCode = addressParts.postalCode;

  if (!city && place.formattedAddress) {
    const bits = String(place.formattedAddress).split(',').map((s: string) => s.trim());
    if (bits.length >= 2) city = bits[bits.length - 3] || bits[0];
    if (bits.length >= 2) country = bits[bits.length - 1];
  }

  const primaryType =
    place.primaryTypeDisplayName?.text ||
    place.primaryType ||
    (Array.isArray(place.types) ? place.types[0] : null);

  return {
    externalId: id.startsWith('places/') ? id.replace('places/', '') : id,
    provider: 'google_places',
    name: typeof displayName === 'string' ? displayName : String(displayName),
    category: primaryType ? String(primaryType).replace(/_/g, ' ') : null,
    subcategory: Array.isArray(place.types) ? place.types.slice(0, 3).join(', ') : null,
    description: place.editorialSummary?.text || null,
    address: place.formattedAddress || null,
    city: city || null,
    state: state || null,
    country: country || null,
    postalCode: postalCode || null,
    latitude: place.location?.latitude ?? null,
    longitude: place.location?.longitude ?? null,
    googleMapsUrl: place.googleMapsUri || null,
    businessHours: place.regularOpeningHours?.weekdayDescriptions
      ? Object.fromEntries(
          (place.regularOpeningHours.weekdayDescriptions as string[]).map((d, i) => [
            String(i),
            d,
          ])
        )
      : null,
    businessStatus: place.businessStatus || null,
    googleRating: place.rating ?? null,
    reviewCount: place.userRatingCount ?? 0,
    phone: place.nationalPhoneNumber || place.internationalPhoneNumber || null,
    website: place.websiteUri || null,
    raw: place,
  };
}

async function placesFetch(
  path: string,
  options: { method?: string; body?: object; fieldMask: string }
): Promise<any> {
  const key = env.googleMapsApiKey;
  if (!key) {
    throw new Error(
      'GOOGLE_MAPS_API_KEY is not set. Add it to .env.local to use real Google Places data.'
    );
  }

  const res = await fetch(`${PLACES_BASE}${path}`, {
    method: options.method || 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': key,
      'X-Goog-FieldMask': options.fieldMask,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google Places API error ${res.status}: ${text.slice(0, 500)}`);
  }

  return res.json();
}

export function createGooglePlacesProvider(): MapsProvider {
  return {
    name: 'google-places',

    async searchBusinesses(filters, options = {}) {
      const limit = Math.min(options.limit ?? 20, 20); // Places API max often 20 per page
      const textQuery = buildTextQuery(filters);

      const body: Record<string, unknown> = {
        textQuery,
        pageSize: limit,
        languageCode: filters.language || 'en',
      };

      // Location bias when we have coordinates or can use region
      const loc = filters.location;
      if (loc?.latitude != null && loc?.longitude != null) {
        body.locationBias = {
          circle: {
            center: { latitude: loc.latitude, longitude: loc.longitude },
            radius: (loc.radius_km ?? 25) * 1000,
          },
        };
      } else if (loc?.country) {
        // Soft bias via query is already in textQuery
      }

      // Optional type restriction
      const cat = (filters.category || filters.industry || '').toLowerCase();
      for (const [key, types] of Object.entries(CATEGORY_TO_TYPES)) {
        if (cat.includes(key)) {
          body.includedType = types[0];
          break;
        }
      }

      const data = await placesFetch('/places:searchText', {
        method: 'POST',
        body,
        fieldMask: SEARCH_FIELD_MASK,
      });

      let businesses: RawBusiness[] = (data.places || []).map(mapPlaceToRaw);

      // Client-side filters Google cannot do
      if (filters.rating_min != null) {
        businesses = businesses.filter(
          (b) => b.googleRating != null && b.googleRating >= filters.rating_min!
        );
      }
      if (filters.reviews_min != null) {
        businesses = businesses.filter(
          (b) => (b.reviewCount ?? 0) >= filters.reviews_min!
        );
      }
      if (filters.website_status === 'no_website') {
        businesses = businesses.filter((b) => !b.website);
      } else if (filters.website_status === 'exists') {
        businesses = businesses.filter((b) => !!b.website);
      }

      return {
        businesses,
        totalEstimated: businesses.length,
        nextPageToken: data.nextPageToken,
      };
    },

    async getPlaceDetails(externalId: string) {
      const name = externalId.startsWith('places/') ? externalId : `places/${externalId}`;
      try {
        const data = await placesFetch(`/${name}`, {
          method: 'GET',
          fieldMask: DETAILS_FIELD_MASK,
        });
        return mapPlaceToRaw(data);
      } catch {
        return null;
      }
    },

    async geocode(query: string) {
      // Use Text Search with a single result as a lightweight geocode
      try {
        const data = await placesFetch('/places:searchText', {
          method: 'POST',
          body: { textQuery: query, pageSize: 1 },
          fieldMask: 'places.location,places.formattedAddress,places.addressComponents',
        });
        const place = data.places?.[0];
        if (!place?.location) return null;
        const parts = parseAddressComponents(place.addressComponents);
        return {
          latitude: place.location.latitude,
          longitude: place.location.longitude,
          city: parts.city,
          state: parts.state,
          country: parts.country,
          postal_code: parts.postalCode,
        } as LocationFilter;
      } catch {
        return null;
      }
    },
  };
}

export function isGooglePlacesConfigured(): boolean {
  return Boolean(env.googleMapsApiKey);
}
