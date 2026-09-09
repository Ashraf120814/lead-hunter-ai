// =============================================================================
// Quota & Subscription Helpers
// =============================================================================

import type { Plan, Usage, Subscription, PlanTier } from '@/types';

export interface QuotaCheckResult {
  allowed: boolean;
  reason?: string;
  remaining?: {
    searches: number | null;
    leads: number | null;
    exports: number | null;
  };
}

/**
 * Check whether the user can perform an action given their plan + current usage.
 */
export function checkQuota(
  action: 'search' | 'lead' | 'export' | 'ai' | 'audit',
  plan: Plan | null,
  usage: Usage | null,
  subscription: Subscription | null
): QuotaCheckResult {
  // No plan / expired trial
  if (!plan || !subscription) {
    return { allowed: false, reason: 'No active subscription. Please upgrade.' };
  }

  const status = subscription.status;
  if (status === 'canceled' || status === 'unpaid' || status === 'incomplete') {
    return { allowed: false, reason: 'Your subscription is not active. Please renew.' };
  }

  // Trial expiration
  if (status === 'trialing' && subscription.trial_end) {
    const trialEnd = new Date(subscription.trial_end);
    if (trialEnd < new Date()) {
      return { allowed: false, reason: 'Your free trial has expired. Please upgrade to continue.' };
    }
  }

  // Unlimited plans
  if (plan.tier === 'enterprise' || (plan.max_searches_per_month === null && plan.max_leads_per_month === null)) {
    return {
      allowed: true,
      remaining: { searches: null, leads: null, exports: null },
    };
  }

  const usedSearches = usage?.searches_count ?? 0;
  const usedLeads = usage?.leads_count ?? 0;
  const usedExports = usage?.exports_count ?? 0;

  const maxSearches = plan.max_searches_per_month ?? 0;
  const maxLeads = plan.max_leads_per_month ?? 0;
  const maxExports = plan.max_exports_per_month ?? 0;

  if (action === 'search' && maxSearches > 0 && usedSearches >= maxSearches) {
    return {
      allowed: false,
      reason: `Search limit reached (${maxSearches}/month). Please upgrade your plan.`,
      remaining: {
        searches: 0,
        leads: Math.max(0, maxLeads - usedLeads),
        exports: Math.max(0, maxExports - usedExports),
      },
    };
  }

  if (action === 'lead' && maxLeads > 0 && usedLeads >= maxLeads) {
    return {
      allowed: false,
      reason: `Lead limit reached (${maxLeads}/month). Please upgrade your plan.`,
      remaining: {
        searches: Math.max(0, maxSearches - usedSearches),
        leads: 0,
        exports: Math.max(0, maxExports - usedExports),
      },
    };
  }

  if (action === 'export' && maxExports > 0 && usedExports >= maxExports) {
    return {
      allowed: false,
      reason: `Export limit reached (${maxExports}/month). Please upgrade your plan.`,
      remaining: {
        searches: Math.max(0, maxSearches - usedSearches),
        leads: Math.max(0, maxLeads - usedLeads),
        exports: 0,
      },
    };
  }

  return {
    allowed: true,
    remaining: {
      searches: maxSearches > 0 ? Math.max(0, maxSearches - usedSearches) : null,
      leads: maxLeads > 0 ? Math.max(0, maxLeads - usedLeads) : null,
      exports: maxExports > 0 ? Math.max(0, maxExports - usedExports) : null,
    },
  };
}

/**
 * Human-readable plan label.
 */
export function planDisplayName(tier: PlanTier): string {
  const map: Record<PlanTier, string> = {
    free_trial: 'Free Trial',
    starter: 'Starter',
    professional: 'Professional',
    business: 'Business',
    enterprise: 'Enterprise',
  };
  return map[tier] ?? tier;
}

/**
 * Check if trial is still active.
 */
export function isTrialActive(subscription: Subscription | null): boolean {
  if (!subscription || subscription.status !== 'trialing') return false;
  if (!subscription.trial_end) return false;
  return new Date(subscription.trial_end) > new Date();
}
