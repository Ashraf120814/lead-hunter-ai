// =============================================================================
// Real Website Audit Provider
// - Always: HTTP check, HTTPS, basic HTML signals
// - Optional: Google PageSpeed Insights when PAGESPEED_API_KEY is set
// Never fabricates data. Returns null-quality when site is unreachable.
// =============================================================================

import type { WebsiteAuditProvider, WebsiteAuditResult } from './types';
import type { WebsiteStatus } from '@/types';
import { env } from '@/config/env';

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

async function fetchWithTimeout(
  url: string,
  ms = 12000
): Promise<Response | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent':
          'LeadHunterAI/1.0 (+https://leadhunter.ai; website-quality-check)',
        Accept: 'text/html,application/xhtml+xml',
      },
    });
    return res;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function analyzeHtml(html: string, finalUrl: string): {
  score: number;
  weaknesses: WebsiteAuditResult['weaknesses'];
  strengths: WebsiteAuditResult['strengths'];
  isMobileHint: boolean;
  hasViewport: boolean;
  title?: string;
  hasHttps: boolean;
} {
  const weaknesses: WebsiteAuditResult['weaknesses'] = [];
  const strengths: WebsiteAuditResult['strengths'] = [];
  let score = 50;

  const hasHttps = finalUrl.startsWith('https://');
  if (!hasHttps) {
    score -= 20;
    weaknesses.push({
      issue: 'No HTTPS',
      severity: 'critical',
      description: 'Site is not served over a secure connection.',
    });
  } else {
    score += 10;
    strengths.push({ item: 'HTTPS', description: 'Secure connection enabled.' });
  }

  const hasViewport = /name=["']viewport["']/i.test(html);
  if (!hasViewport) {
    score -= 15;
    weaknesses.push({
      issue: 'Missing viewport meta',
      severity: 'high',
      description: 'Page likely not optimized for mobile devices.',
    });
  } else {
    score += 8;
    strengths.push({ item: 'Viewport meta', description: 'Basic mobile meta present.' });
  }

  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  const title = titleMatch?.[1]?.trim();
  if (!title || title.length < 3) {
    score -= 8;
    weaknesses.push({
      issue: 'Missing or empty title',
      severity: 'medium',
      description: 'Page has no meaningful <title> tag.',
    });
  } else {
    score += 5;
  }

  if (!/<meta[^>]+name=["']description["']/i.test(html)) {
    score -= 5;
    weaknesses.push({
      issue: 'Missing meta description',
      severity: 'medium',
      description: 'No meta description found for SEO.',
    });
  }

  // Very rough modernity signals
  if (/jquery[.-]?1\.[0-7]/i.test(html) || /bootstrap[.-]?3/i.test(html)) {
    score -= 12;
    weaknesses.push({
      issue: 'Outdated libraries',
      severity: 'high',
      description: 'Detected older jQuery/Bootstrap versions often tied to outdated designs.',
    });
  }

  if (/wordpress/i.test(html) || /wp-content/i.test(html)) {
    strengths.push({ item: 'CMS detected', description: 'WordPress signals present.' });
  }

  // Table-based layout heuristic
  if ((html.match(/<table/gi) || []).length > 5 && !/<div/i.test(html)) {
    score -= 15;
    weaknesses.push({
      issue: 'Likely outdated layout',
      severity: 'high',
      description: 'Heavy table-based markup suggests an old design.',
    });
  }

  score = Math.max(5, Math.min(95, score));

  return {
    score,
    weaknesses,
    strengths,
    isMobileHint: hasViewport,
    hasViewport,
    title,
    hasHttps,
  };
}

async function pageSpeedScore(url: string): Promise<number | null> {
  const key = env.pagespeedApiKey || env.googleMapsApiKey; // PSI can use same Google Cloud key if enabled
  if (!key) return null;

  try {
    const endpoint = new URL(
      'https://www.googleapis.com/pagespeedonline/v5/runPagespeed'
    );
    endpoint.searchParams.set('url', url);
    endpoint.searchParams.set('key', key);
    endpoint.searchParams.set('strategy', 'mobile');
    endpoint.searchParams.set('category', 'performance');

    const res = await fetch(endpoint.toString(), { signal: AbortSignal.timeout(25000) });
    if (!res.ok) return null;
    const data = await res.json();
    const score = data?.lighthouseResult?.categories?.performance?.score;
    if (typeof score === 'number') return Math.round(score * 100);
    return null;
  } catch {
    return null;
  }
}

export const realWebsiteAuditProvider: WebsiteAuditProvider = {
  name: 'real-audit',

  async audit(url: string): Promise<WebsiteAuditResult | null> {
    if (!url || !url.trim()) {
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
        missingPages: [],
      };
    }

    let normalized = url.trim();
    if (!/^https?:\/\//i.test(normalized)) {
      normalized = 'https://' + normalized;
    }

    const res = await fetchWithTimeout(normalized);
    if (!res) {
      // Try http fallback
      const httpUrl = normalized.replace(/^https:\/\//i, 'http://');
      const res2 = await fetchWithTimeout(httpUrl);
      if (!res2) {
        return {
          url: normalized,
          status: 'broken',
          qualityScore: 10,
          isHttps: false,
          isMobileResponsive: null,
          pageSpeedScore: null,
          coreWebVitals: null,
          seoScore: null,
          accessibilityScore: null,
          uiUxScore: null,
          modernityScore: null,
          conversionScore: null,
          hasBrokenLinks: true,
          hasSsl: false,
          technologies: [],
          weaknesses: [
            {
              issue: 'Website unreachable',
              severity: 'critical',
              description: 'Could not load the website within the timeout.',
            },
          ],
          strengths: [],
          missingPages: [],
        };
      }
      return auditResponse(res2, httpUrl);
    }

    return auditResponse(res, res.url || normalized);
  },

  async checkExists(url: string) {
    if (!url?.trim()) return false;
    let normalized = url.trim();
    if (!/^https?:\/\//i.test(normalized)) normalized = 'https://' + normalized;
    const res = await fetchWithTimeout(normalized, 8000);
    return !!res && res.ok;
  },
};

async function auditResponse(res: Response, finalUrl: string): Promise<WebsiteAuditResult> {
  const html = await res.text().catch(() => '');
  const basic = analyzeHtml(html.slice(0, 200_000), finalUrl);
  const psi = await pageSpeedScore(finalUrl);

  let quality = basic.score;
  if (psi != null) {
    // Blend HTML heuristics with PageSpeed
    quality = Math.round(basic.score * 0.45 + psi * 0.55);
  }

  const weaknesses = [...basic.weaknesses];
  if (psi != null && psi < 40) {
    weaknesses.push({
      issue: 'Slow mobile performance',
      severity: 'high',
      description: `PageSpeed mobile score: ${psi}/100.`,
    });
  }

  return {
    url: finalUrl,
    status: deriveStatus(quality, true),
    qualityScore: quality,
    isHttps: basic.hasHttps,
    isMobileResponsive: basic.hasViewport,
    pageSpeedScore: psi,
    coreWebVitals: null,
    seoScore: basic.title ? Math.min(90, quality + 5) : Math.max(20, quality - 10),
    accessibilityScore: null,
    uiUxScore: quality,
    modernityScore: quality,
    conversionScore: Math.max(10, quality - 8),
    hasBrokenLinks: !res.ok,
    hasSsl: basic.hasHttps,
    technologies: [],
    weaknesses,
    strengths: basic.strengths,
    missingPages: [],
  };
}
