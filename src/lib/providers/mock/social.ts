// =============================================================================
// Mock Social Discovery Provider
// =============================================================================

import type { SocialDiscoveryProvider, RawSocialProfile } from '../types';

const KNOWN_SOCIAL: Record<string, RawSocialProfile[]> = {
  'Al Noor Jewellery': [
    {
      platform: 'instagram',
      url: 'https://instagram.com/alnoorjewellery',
      username: 'alnoorjewellery',
      followersCount: 12800,
      isVerified: false,
    },
    {
      platform: 'facebook',
      url: 'https://facebook.com/alnoorjewellery',
      username: 'alnoorjewellery',
      followersCount: 5400,
    },
  ],
  'Bella Cucina Trattoria': [
    {
      platform: 'instagram',
      url: 'https://instagram.com/bellacucina_chi',
      username: 'bellacucina_chi',
      followersCount: 3200,
    },
    {
      platform: 'facebook',
      url: 'https://facebook.com/bellacucina',
      username: 'bellacucina',
      followersCount: 2100,
    },
  ],
  'Harley Street Dental Studio': [
    {
      platform: 'instagram',
      url: 'https://instagram.com/harleystreetdental',
      username: 'harleystreetdental',
      followersCount: 890,
    },
  ],
  'Glow Beauty Lounge': [
    {
      platform: 'instagram',
      url: 'https://instagram.com/glowbeautylounge',
      username: 'glowbeautylounge',
      followersCount: 15600,
      isVerified: false,
    },
    {
      platform: 'tiktok',
      url: 'https://tiktok.com/@glowbeautylounge',
      username: 'glowbeautylounge',
      followersCount: 4200,
    },
  ],
  'Royal Diamond House': [
    {
      platform: 'instagram',
      url: 'https://instagram.com/royaldiamondhouse',
      username: 'royaldiamondhouse',
      followersCount: 45200,
      isVerified: true,
    },
    {
      platform: 'facebook',
      url: 'https://facebook.com/royaldiamondhouse',
      username: 'royaldiamondhouse',
      followersCount: 18900,
    },
    {
      platform: 'youtube',
      url: 'https://youtube.com/@royaldiamondhouse',
      username: 'royaldiamondhouse',
    },
  ],
  'Wellness Family Clinic': [
    {
      platform: 'facebook',
      url: 'https://facebook.com/wellnessfamilyclinic',
      username: 'wellnessfamilyclinic',
      followersCount: 1100,
    },
  ],
};

export const mockSocialProvider: SocialDiscoveryProvider = {
  name: 'mock-social',

  async findProfiles(businessName: string) {
    // Exact match first
    if (KNOWN_SOCIAL[businessName]) {
      return KNOWN_SOCIAL[businessName];
    }

    // Fuzzy: partial name match
    const key = Object.keys(KNOWN_SOCIAL).find((k) =>
      k.toLowerCase().includes(businessName.toLowerCase().slice(0, 8))
    );
    if (key) return KNOWN_SOCIAL[key];

    // Default: no profiles found (honest)
    return [];
  },
};
