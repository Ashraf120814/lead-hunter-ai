// =============================================================================
// Zod schemas for search & lead operations
// =============================================================================

import { z } from 'zod';

export const locationFilterSchema = z.object({
  country: z.string().optional(),
  state: z.string().optional(),
  city: z.string().optional(),
  postal_code: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  radius_km: z.number().min(0).max(500).optional(),
  exact: z.boolean().optional(),
});

export const searchFiltersSchema = z.object({
  location: locationFilterSchema.optional(),
  industry: z.string().optional(),
  category: z.string().optional(),
  subcategory: z.string().optional(),
  business_size: z.string().optional(),
  estimated_revenue_min: z.number().optional(),
  estimated_revenue_max: z.number().optional(),
  employees_min: z.number().optional(),
  employees_max: z.number().optional(),
  rating_min: z.number().min(0).max(5).optional(),
  rating_max: z.number().min(0).max(5).optional(),
  reviews_min: z.number().min(0).optional(),
  reviews_max: z.number().min(0).optional(),
  website_status: z
    .union([
      z.enum(['no_website', 'exists', 'broken', 'outdated', 'poor', 'average', 'good', 'excellent']),
      z.array(z.enum(['no_website', 'exists', 'broken', 'outdated', 'poor', 'average', 'good', 'excellent'])),
    ])
    .optional(),
  website_quality_max: z.number().min(0).max(100).optional(),
  social_presence: z.boolean().optional(),
  business_age_min: z.number().optional(),
  keywords: z.array(z.string()).optional(),
  language: z.string().optional(),
  lead_score_min: z.number().min(0).max(100).optional(),
  purchase_probability_min: z.number().min(0).max(100).optional(),
  contact_available: z.boolean().optional(),
  has_phone: z.boolean().optional(),
  has_email: z.boolean().optional(),
});

export const naturalLanguageSearchSchema = z.object({
  query: z.string().min(3).max(500),
});

export const leadStatusSchema = z.enum([
  'new',
  'contacted',
  'interested',
  'follow_up',
  'proposal_sent',
  'negotiation',
  'won',
  'lost',
  'not_interested',
  'archived',
]);

export const updateLeadSchema = z.object({
  status: leadStatusSchema.optional(),
  is_favorite: z.boolean().optional(),
  is_archived: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().max(5000).optional(),
  follow_up_date: z.string().optional().nullable(),
  deal_value_cents: z.number().int().min(0).optional().nullable(),
});

export type SearchFiltersInput = z.infer<typeof searchFiltersSchema>;
export type UpdateLeadInput = z.infer<typeof updateLeadSchema>;
