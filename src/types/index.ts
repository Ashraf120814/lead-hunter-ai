// =============================================================================
// Lead Hunter AI — Core TypeScript Types
// =============================================================================

// ---------- Enums (mirroring DB) ----------

export type UserRole = 'ADMIN' | 'USER' | 'TEAM_ADMIN' | 'TEAM_MEMBER';

export type SubscriptionStatus =
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'unpaid'
  | 'incomplete'
  | 'paused';

export type PlanTier = 'free_trial' | 'starter' | 'professional' | 'business' | 'enterprise';

export type LeadStatus =
  | 'new'
  | 'contacted'
  | 'interested'
  | 'follow_up'
  | 'proposal_sent'
  | 'negotiation'
  | 'won'
  | 'lost'
  | 'not_interested'
  | 'archived';

export type WebsiteStatus =
  | 'no_website'
  | 'exists'
  | 'broken'
  | 'outdated'
  | 'poor'
  | 'average'
  | 'good'
  | 'excellent';

export type HeatScore = 'very_hot' | 'hot' | 'warm' | 'cold';

export type OpportunityType =
  | 'website'
  | 'ecommerce'
  | 'seo'
  | 'ai_chatbot'
  | 'automation'
  | 'booking'
  | 'crm'
  | 'web_app'
  | 'mobile_app'
  | 'redesign'
  | 'landing_page';

export type OutreachChannel =
  | 'email'
  | 'instagram_dm'
  | 'facebook_messenger'
  | 'linkedin'
  | 'whatsapp'
  | 'sms'
  | 'call'
  | 'contact_form';

export type AIConfidence = 'low' | 'medium' | 'high';

export type AuditStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

// ---------- Core Entities ----------

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  company_name: string | null;
  phone: string | null;
  timezone: string;
  preferred_language: string;
  theme_preference: 'light' | 'dark' | 'system';
  is_active: boolean;
  trial_started_at: string | null;
  trial_ends_at: string | null;
  onboarding_completed: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Plan {
  id: string;
  tier: PlanTier;
  name: string;
  description: string | null;
  price_monthly_cents: number;
  price_yearly_cents: number;
  currency: string;
  max_searches_per_month: number | null;
  max_leads_per_month: number | null;
  max_exports_per_month: number | null;
  max_team_members: number | null;
  features: string[];
  is_active: boolean;
  sort_order: number;
}

export interface Subscription {
  id: string;
  user_id: string;
  plan_id: string;
  status: SubscriptionStatus;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  trial_start: string | null;
  trial_end: string | null;
  cancel_at_period_end: boolean;
  canceled_at: string | null;
  plan?: Plan;
}

export interface Usage {
  id: string;
  user_id: string;
  period_start: string;
  period_end: string;
  searches_count: number;
  leads_count: number;
  exports_count: number;
  ai_calls_count: number;
  website_audits_count: number;
}

// ---------- Location & Search ----------

export interface LocationFilter {
  country?: string;
  state?: string;
  city?: string;
  postal_code?: string;
  latitude?: number;
  longitude?: number;
  radius_km?: number;
  exact?: boolean;
  multiple?: LocationFilter[];
}

export interface SearchFilters {
  location?: LocationFilter;
  industry?: string;
  category?: string;
  subcategory?: string;
  business_size?: string;
  estimated_revenue_min?: number;
  estimated_revenue_max?: number;
  employees_min?: number;
  employees_max?: number;
  rating_min?: number;
  rating_max?: number;
  reviews_min?: number;
  reviews_max?: number;
  website_status?: WebsiteStatus | WebsiteStatus[];
  website_quality_max?: number;
  social_presence?: boolean;
  business_age_min?: number;
  keywords?: string[];
  language?: string;
  lead_score_min?: number;
  purchase_probability_min?: number;
  contact_available?: boolean;
  has_phone?: boolean;
  has_email?: boolean;
}

export interface Search {
  id: string;
  user_id: string;
  query_text: string | null;
  filters: SearchFilters;
  location: LocationFilter | null;
  industry: string | null;
  category: string | null;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'partial';
  total_found: number;
  high_potential_count: number;
  progress: {
    stage?: string;
    percent?: number;
    message?: string;
  };
  error_message: string | null;
  provider_used: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

// ---------- Business & Related ----------

export interface Business {
  id: string;
  external_id: string | null;
  provider: string | null;
  name: string;
  category: string | null;
  subcategory: string | null;
  description: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  postal_code: string | null;
  latitude: number | null;
  longitude: number | null;
  google_maps_url: string | null;
  business_hours: Record<string, string> | null;
  business_status: string | null;
  year_established: number | null;
  estimated_employees_min: number | null;
  estimated_employees_max: number | null;
  estimated_revenue_min: number | null;
  estimated_revenue_max: number | null;
  google_rating: number | null;
  review_count: number;
  language: string | null;
  is_verified: boolean;
  last_verified_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Contact {
  id: string;
  business_id: string;
  phone: string | null;
  alternate_phones: string[] | null;
  email: string | null;
  alternate_emails: string[] | null;
  contact_page_url: string | null;
  booking_url: string | null;
  whatsapp: string | null;
  source: string | null;
  is_verified: boolean;
  verified_at: string | null;
}

export interface SocialProfile {
  id: string;
  business_id: string;
  platform: string;
  url: string;
  username: string | null;
  followers_count: number | null;
  is_verified: boolean;
  last_checked_at: string | null;
}

export interface WebsiteAudit {
  id: string;
  business_id: string;
  website_url: string | null;
  status: WebsiteStatus;
  quality_score: number | null;
  audit_status: AuditStatus;
  is_https: boolean | null;
  is_mobile_responsive: boolean | null;
  page_speed_score: number | null;
  core_web_vitals: Record<string, number> | null;
  seo_score: number | null;
  accessibility_score: number | null;
  ui_ux_score: number | null;
  modernity_score: number | null;
  conversion_score: number | null;
  has_broken_links: boolean | null;
  has_ssl: boolean | null;
  technologies: string[] | null;
  weaknesses: Array<{
    issue: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
  }>;
  strengths: Array<{
    item: string;
    description: string;
  }>;
  missing_pages: string[] | null;
  audited_at: string | null;
}

// ---------- Scoring ----------

export interface ScoreBreakdown {
  website_opportunity: number;   // max configurable (default 25)
  business_strength: number;    // max 25
  online_activity: number;      // max 20
  contactability: number;       // max 15
  purchase_signals: number;     // max 15
  total: number;                // 0-100
}

export interface ScoringWeights {
  website_opportunity: number;
  business_strength: number;
  online_activity: number;
  contactability: number;
  purchase_signals: number;
}

export interface ScoringInput {
  // Website signals
  websiteStatus: WebsiteStatus;
  websiteQualityScore: number | null; // 0-100
  hasWebsite: boolean;

  // Business strength
  googleRating: number | null;
  reviewCount: number;
  estimatedEmployees?: number | null;
  yearEstablished?: number | null;
  category?: string | null;

  // Online activity
  socialProfilesCount: number;
  hasInstagram: boolean;
  hasFacebook: boolean;
  hasLinkedIn: boolean;
  hasActiveSocial: boolean;

  // Contactability
  hasPhone: boolean;
  hasEmail: boolean;
  hasWhatsApp: boolean;
  hasBookingLink: boolean;

  // Extra purchase signals
  highRatingLowWebsite?: boolean; // strong offline, weak digital
  competitorGap?: boolean;
  industryDigitalMaturity?: 'low' | 'medium' | 'high';
}

export interface ScoringResult {
  leadScore: number;
  starRating: number; // 1-5
  purchaseProbability: number; // 0-100
  aiConfidence: AIConfidence;
  heatScore: HeatScore;
  breakdown: ScoreBreakdown;
  opportunityTypes: OpportunityType[];
  recommendedSolution: string;
}

// ---------- Lead (CRM record) ----------

export interface Lead {
  id: string;
  user_id: string;
  business_id: string;
  search_id: string | null;

  lead_score: number;
  star_rating: number;
  purchase_probability: number;
  ai_confidence: AIConfidence;
  heat_score: HeatScore | null;
  score_breakdown: ScoreBreakdown;

  ai_summary: string | null;
  recommended_solution: string | null;
  opportunity_types: OpportunityType[];
  website_recommendation: string | null;
  website_prompt: string | null;

  status: LeadStatus;
  is_favorite: boolean;
  is_archived: boolean;
  tags: string[];
  notes: string | null;
  follow_up_date: string | null;
  last_contacted_at: string | null;
  deal_value_cents: number | null;

  source: string | null;
  created_at: string;
  updated_at: string;

  // Joined relations (optional)
  business?: Business;
  contact?: Contact | null;
  social_profiles?: SocialProfile[];
  website_audit?: WebsiteAudit | null;
}

// ---------- Outreach ----------

export interface Outreach {
  id: string;
  lead_id: string;
  user_id: string;
  channel: OutreachChannel;
  version: string | null;
  subject: string | null;
  body: string;
  call_script: CallScript | null;
  is_copied: boolean;
  is_sent: boolean;
  sent_at: string | null;
  created_at: string;
}

export interface CallScript {
  opening: string;
  permission_question: string;
  personalized_observation: string;
  problem_opportunity: string;
  value_proposition: string;
  discovery_questions: string[];
  objection_handling: Record<string, string>;
  offer: string;
  cta: string;
  follow_up: string;
}

// ---------- Notes, Followups, Exports ----------

export interface Note {
  id: string;
  lead_id: string;
  user_id: string;
  content: string;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
}

export interface Followup {
  id: string;
  lead_id: string;
  user_id: string;
  scheduled_date: string;
  channel: OutreachChannel | null;
  message_template: string | null;
  status: 'pending' | 'completed' | 'skipped' | 'canceled';
  completed_at: string | null;
  created_at: string;
}

export interface ExportRecord {
  id: string;
  user_id: string;
  search_id: string | null;
  file_name: string;
  file_path: string | null;
  lead_count: number;
  filters_applied: SearchFilters | null;
  status: 'pending' | 'completed' | 'failed';
  created_at: string;
}

// ---------- Admin ----------

export interface AdminSettings {
  scoring_weights: ScoringWeights;
  trial_duration_hours: number;
  developer_branding: {
    name: string;
    role: string;
    brand: string;
    portfolio: string;
    linkedin: string;
    github: string;
    email: string;
    website: string;
  };
  app_branding: {
    app_name: string;
    footer_text: string;
    support_email: string;
  };
  ai_settings: {
    model: string;
    temperature: number;
    max_tokens: number;
  };
}

// ---------- API / UI Helpers ----------

export interface LeadCardData {
  id: string;
  name: string;
  category: string | null;
  location: string;
  starRating: number;
  leadScore: number;
  purchaseProbability: number;
  websiteStatus: WebsiteStatus;
  websiteQuality: number | null;
  googleRating: number | null;
  reviewCount: number;
  hasPhone: boolean;
  hasEmail: boolean;
  hasInstagram: boolean;
  heatScore: HeatScore;
  opportunity: string;
}

export interface DashboardStats {
  total_leads: number;
  new_leads: number;
  contacted: number;
  interested: number;
  follow_ups: number;
  proposals: number;
  won: number;
  lost: number;
  favorites: number;
  avg_lead_score: number;
  avg_purchase_probability: number;
  very_hot_count: number;
  conversion_rate: number;
  estimated_pipeline_cents: number;
}

export interface NaturalLanguageSearchResult {
  filters: SearchFilters;
  interpretedQuery: string;
  confidence: number;
}
