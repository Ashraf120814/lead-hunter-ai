// =============================================================================
// Display formatters
// =============================================================================

import type { HeatScore, LeadStatus, WebsiteStatus } from '@/types';

export function formatScore(score: number | null | undefined): string {
  if (score == null) return '—';
  return `${Math.round(score)}/100`;
}

export function formatProbability(p: number | null | undefined): string {
  if (p == null) return '—';
  return `${Math.round(p)}%`;
}

export function formatRating(rating: number | null | undefined): string {
  if (rating == null) return '—';
  return rating.toFixed(1);
}

export function formatNumber(n: number | null | undefined): string {
  if (n == null) return '—';
  return n.toLocaleString();
}

export function formatStars(stars: number): string {
  const full = Math.floor(stars);
  const empty = 5 - full;
  return '★'.repeat(full) + '☆'.repeat(empty);
}

export function heatLabel(heat: HeatScore | null | undefined): string {
  switch (heat) {
    case 'very_hot':
      return '🔥 Very Hot';
    case 'hot':
      return '🟠 Hot';
    case 'warm':
      return '🟡 Warm';
    case 'cold':
      return '🔵 Cold';
    default:
      return '—';
  }
}

export function heatColor(heat: HeatScore | null | undefined): string {
  switch (heat) {
    case 'very_hot':
      return 'text-red-500';
    case 'hot':
      return 'text-orange-500';
    case 'warm':
      return 'text-yellow-500';
    case 'cold':
      return 'text-blue-400';
    default:
      return 'text-muted-foreground';
  }
}

export function statusLabel(status: LeadStatus): string {
  const map: Record<LeadStatus, string> = {
    new: 'New',
    contacted: 'Contacted',
    interested: 'Interested',
    follow_up: 'Follow-up',
    proposal_sent: 'Proposal Sent',
    negotiation: 'Negotiation',
    won: 'Won',
    lost: 'Lost',
    not_interested: 'Not Interested',
    archived: 'Archived',
  };
  return map[status] ?? status;
}

export function websiteStatusLabel(status: WebsiteStatus): string {
  const map: Record<WebsiteStatus, string> = {
    no_website: 'No Website',
    exists: 'Exists',
    broken: 'Broken',
    outdated: 'Outdated',
    poor: 'Poor',
    average: 'Average',
    good: 'Good',
    excellent: 'Excellent',
  };
  return map[status] ?? status;
}

export function formatCurrency(cents: number | null | undefined, currency = 'USD'): string {
  if (cents == null) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function formatRelativeDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString();
}

export function locationString(parts: {
  city?: string | null;
  state?: string | null;
  country?: string | null;
}): string {
  return [parts.city, parts.state, parts.country].filter(Boolean).join(', ') || '—';
}
