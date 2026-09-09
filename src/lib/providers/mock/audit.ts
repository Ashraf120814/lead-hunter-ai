// =============================================================================
// Mock Website Audit Provider
// Returns realistic audit results. Replace with PageSpeed + custom crawler.
// =============================================================================

import type { WebsiteAuditProvider, WebsiteAuditResult } from '../types';
import type { WebsiteStatus } from '@/types';

function deriveStatus(score: number | null, hasWebsite: boolean): WebsiteStatus {
  if (!hasWebsite) return 'no_website';
  if (score === null) return 'exists';
  if (score < 25) return 'broken';
  if (score < 40) return 'poor';
  if (score < 55) return 'outdated';
  if (score < 70) return 'average';
  if (score < 85) return 'good';
  return 'excellent';
}

const KNOWN_AUDITS: Record<string, Partial<WebsiteAuditResult>> = {
  'http://bellacucina-chicago.example.com': {
    qualityScore: 28,
    isHttps: false,
    isMobileResponsive: false,
    pageSpeedScore: 22,
    seoScore: 31,
    modernityScore: 18,
    conversionScore: 20,
    weaknesses: [
      { issue: 'No HTTPS', severity: 'critical', description: 'Site is served over insecure HTTP.' },
      { issue: 'Not mobile responsive', severity: 'high', description: 'Layout breaks on mobile devices.' },
      { issue: 'Outdated design', severity: 'high', description: 'Design appears to be from 2014-2016 era.' },
      { issue: 'Missing meta descriptions', severity: 'medium', description: 'Most pages lack proper meta tags.' },
      { issue: 'Slow page load', severity: 'high', description: 'LCP > 5s on mobile.' },
    ],
    strengths: [{ item: 'Basic contact info', description: 'Phone number is visible in the header.' }],
    technologies: ['jQuery 1.11', 'Bootstrap 3'],
  },
  'https://glowbeautylounge.example.com': {
    qualityScore: 61,
    isHttps: true,
    isMobileResponsive: true,
    pageSpeedScore: 58,
    seoScore: 55,
    modernityScore: 52,
    conversionScore: 48,
    weaknesses: [
      { issue: 'Weak CTAs', severity: 'medium', description: 'Primary call-to-action is unclear.' },
      { issue: 'No online booking', severity: 'medium', description: 'Customers must call to book.' },
      { issue: 'Limited trust signals', severity: 'low', description: 'Few reviews or testimonials shown.' },
    ],
    strengths: [
      { item: 'HTTPS enabled', description: 'Secure connection.' },
      { item: 'Mobile friendly', description: 'Passes basic mobile viewport checks.' },
    ],
    technologies: ['WordPress', 'Elementor'],
  },
  'https://royaldiamondhouse.example.com': {
    qualityScore: 72,
    isHttps: true,
    isMobileResponsive: true,
    pageSpeedScore: 65,
    seoScore: 70,
    modernityScore: 68,
    conversionScore: 60,
    weaknesses: [
      { issue: 'No WhatsApp integration', severity: 'medium', description: 'Missed opportunity for high-intent Dubai market.' },
      { issue: 'Catalog not filterable', severity: 'medium', description: 'Product browsing experience is limited.' },
    ],
    strengths: [
      { item: 'Professional photography', description: 'High-quality product images.' },
      { item: 'Clear contact page', description: 'Multiple contact methods available.' },
    ],
    technologies: ['Shopify', 'React'],
  },
  'http://morningbrew-to.example.com': {
    qualityScore: 35,
    isHttps: false,
    isMobileResponsive: true,
    pageSpeedScore: 40,
    seoScore: 28,
    modernityScore: 30,
    conversionScore: 25,
    weaknesses: [
      { issue: 'No HTTPS', severity: 'critical', description: 'Insecure connection.' },
      { issue: 'No menu / online ordering', severity: 'high', description: 'Missed conversion opportunity.' },
      { issue: 'Poor SEO', severity: 'high', description: 'Missing structured data and local SEO signals.' },
    ],
    strengths: [{ item: 'Simple layout', description: 'Easy to understand.' }],
    technologies: ['Wix'],
  },
};

export const mockWebsiteAuditProvider: WebsiteAuditProvider = {
  name: 'mock-audit',

  async audit(url: string): Promise<WebsiteAuditResult | null> {
    if (!url || url.trim() === '') {
      return {
        url: '',
        status: 'no_website',
        qualityScore: null,
        isHttps: null,
        isMobileResponsive: null,
        pageSpeedScore: null,
        coreWebVitals: null,
        seoScore: null,
        accessibilityScore: null,
        uiUxScore: null,
        modernityScore: null,
        conversionScore: null,
        hasBrokenLinks: null,
        hasSsl: null,
        technologies: [],
        weaknesses: [
          {
            issue: 'No website found',
            severity: 'critical',
            description: 'This business has no detectable public website.',
          },
        ],
        strengths: [],
        missingPages: ['Home', 'About', 'Services', 'Contact'],
      };
    }

    const known = KNOWN_AUDITS[url];
    if (known) {
      const score = known.qualityScore ?? 50;
      return {
        url,
        status: deriveStatus(score, true),
        qualityScore: score,
        isHttps: known.isHttps ?? true,
        isMobileResponsive: known.isMobileResponsive ?? true,
        pageSpeedScore: known.pageSpeedScore ?? score,
        coreWebVitals: { lcp: 3.2, cls: 0.15, fid: 120 },
        seoScore: known.seoScore ?? score,
        accessibilityScore: Math.min(100, (score || 50) + 5),
        uiUxScore: known.modernityScore ?? score,
        modernityScore: known.modernityScore ?? score,
        conversionScore: known.conversionScore ?? Math.max(10, (score || 50) - 10),
        hasBrokenLinks: score < 40,
        hasSsl: known.isHttps ?? false,
        technologies: known.technologies ?? [],
        weaknesses: known.weaknesses ?? [],
        strengths: known.strengths ?? [],
        missingPages: score < 50 ? ['Blog', 'FAQ', 'Testimonials'] : [],
      };
    }

    // Generic fallback for unknown URLs
    const genericScore = 48;
    return {
      url,
      status: deriveStatus(genericScore, true),
      qualityScore: genericScore,
      isHttps: url.startsWith('https'),
      isMobileResponsive: true,
      pageSpeedScore: 45,
      coreWebVitals: null,
      seoScore: 42,
      accessibilityScore: 50,
      uiUxScore: 45,
      modernityScore: 40,
      conversionScore: 38,
      hasBrokenLinks: false,
      hasSsl: url.startsWith('https'),
      technologies: ['Unknown'],
      weaknesses: [
        {
          issue: 'Limited analysis',
          severity: 'low',
          description: 'Full audit data not available for this URL in mock mode.',
        },
      ],
      strengths: [],
      missingPages: [],
    };
  },

  async checkExists(url: string) {
    return !!url && url.trim().length > 0;
  },
};
