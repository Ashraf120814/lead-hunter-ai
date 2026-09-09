// =============================================================================
// Lead Ranking Agent
// =============================================================================

import type { RankingAgent } from './types';
import type { Lead } from '@/types';

export const rankingAgent: RankingAgent = {
  async recommendTopLeads(leads: Lead[], limit = 10) {
    // Sort by lead_score then purchase_probability
    const sorted = [...leads]
      .filter((l) => !l.is_archived)
      .sort((a, b) => {
        if (b.lead_score !== a.lead_score) return b.lead_score - a.lead_score;
        return b.purchase_probability - a.purchase_probability;
      })
      .slice(0, limit);

    return sorted.map((lead, index) => {
      const reasons: string[] = [];
      if (lead.lead_score >= 90) reasons.push('Exceptional overall score');
      else if (lead.lead_score >= 80) reasons.push('Very high commercial potential');
      if (lead.purchase_probability >= 80) reasons.push('Strong estimated purchase likelihood');
      if (lead.heat_score === 'very_hot') reasons.push('Marked as Very Hot');
      if (lead.opportunity_types?.includes('website') || lead.opportunity_types?.includes('redesign')) {
        reasons.push('Clear website opportunity');
      }
      if (lead.score_breakdown?.contactability >= 12) reasons.push('Highly contactable');

      return {
        leadId: lead.id,
        reason:
          reasons.length > 0
            ? reasons.join(' · ')
            : `Ranked #${index + 1} by combined lead score and purchase probability`,
        priority: index + 1,
      };
    });
  },
};
