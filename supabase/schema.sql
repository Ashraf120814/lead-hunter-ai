-- =============================================================================
-- Lead Hunter AI — Complete PostgreSQL / Supabase Schema
-- Production-ready with relationships, indexes, RLS policies, and enums
-- =============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- for fuzzy search

-- =============================================================================
-- ENUMS
-- =============================================================================

CREATE TYPE user_role AS ENUM ('ADMIN', 'USER', 'TEAM_ADMIN', 'TEAM_MEMBER');
CREATE TYPE subscription_status AS ENUM (
  'trialing', 'active', 'past_due', 'canceled', 'unpaid', 'incomplete', 'paused'
);
CREATE TYPE plan_tier AS ENUM ('free_trial', 'starter', 'professional', 'business', 'enterprise');
CREATE TYPE lead_status AS ENUM (
  'new', 'contacted', 'interested', 'follow_up', 'proposal_sent',
  'negotiation', 'won', 'lost', 'not_interested', 'archived'
);
CREATE TYPE website_status AS ENUM (
  'no_website', 'exists', 'broken', 'outdated', 'poor', 'average', 'good', 'excellent'
);
CREATE TYPE heat_score AS ENUM ('very_hot', 'hot', 'warm', 'cold');
CREATE TYPE opportunity_type AS ENUM (
  'website', 'ecommerce', 'seo', 'ai_chatbot', 'automation',
  'booking', 'crm', 'web_app', 'mobile_app', 'redesign', 'landing_page'
);
CREATE TYPE outreach_channel AS ENUM (
  'email', 'instagram_dm', 'facebook_messenger', 'linkedin', 'whatsapp', 'sms', 'call', 'contact_form'
);
CREATE TYPE audit_status AS ENUM ('pending', 'running', 'completed', 'failed', 'skipped');

-- =============================================================================
-- USERS & AUTH (extends Supabase auth.users)
-- =============================================================================

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  role user_role NOT NULL DEFAULT 'USER',
  company_name TEXT,
  phone TEXT,
  timezone TEXT DEFAULT 'UTC',
  preferred_language TEXT DEFAULT 'en',
  theme_preference TEXT DEFAULT 'system' CHECK (theme_preference IN ('light', 'dark', 'system')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  trial_started_at TIMESTAMPTZ,
  trial_ends_at TIMESTAMPTZ,
  onboarding_completed BOOLEAN DEFAULT false,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_profiles_email ON public.profiles(email);
CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_profiles_active ON public.profiles(is_active);

-- =============================================================================
-- SUBSCRIPTIONS & BILLING
-- =============================================================================

CREATE TABLE public.plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tier plan_tier NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  price_monthly_cents INTEGER NOT NULL DEFAULT 0,
  price_yearly_cents INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  max_searches_per_month INTEGER,          -- NULL = unlimited
  max_leads_per_month INTEGER,
  max_exports_per_month INTEGER,
  max_team_members INTEGER DEFAULT 1,
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.plans(id),
  status subscription_status NOT NULL DEFAULT 'trialing',
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  razorpay_subscription_id TEXT,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  trial_start TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  canceled_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE INDEX idx_subscriptions_user ON public.subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX idx_subscriptions_stripe ON public.subscriptions(stripe_customer_id);

CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.subscriptions(id),
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL, -- succeeded, pending, failed, refunded
  provider TEXT NOT NULL, -- stripe, razorpay
  provider_payment_id TEXT,
  invoice_url TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payments_user ON public.payments(user_id);

-- =============================================================================
-- USAGE TRACKING (quotas)
-- =============================================================================

CREATE TABLE public.usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  searches_count INTEGER NOT NULL DEFAULT 0,
  leads_count INTEGER NOT NULL DEFAULT 0,
  exports_count INTEGER NOT NULL DEFAULT 0,
  ai_calls_count INTEGER NOT NULL DEFAULT 0,
  website_audits_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, period_start)
);

CREATE INDEX idx_usage_user_period ON public.usage(user_id, period_start);

-- =============================================================================
-- SEARCHES
-- =============================================================================

CREATE TABLE public.searches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  query_text TEXT,                          -- natural language query if used
  filters JSONB NOT NULL DEFAULT '{}'::jsonb, -- structured filters
  location JSONB,                           -- {country, state, city, zip, lat, lng, radius}
  industry TEXT,
  category TEXT,
  subcategory TEXT,
  status TEXT NOT NULL DEFAULT 'pending',   -- pending, running, completed, failed, partial
  total_found INTEGER DEFAULT 0,
  high_potential_count INTEGER DEFAULT 0,
  progress JSONB DEFAULT '{}'::jsonb,       -- {stage, percent, message}
  error_message TEXT,
  provider_used TEXT,                       -- google_places, osm, serpapi, etc.
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_searches_user ON public.searches(user_id);
CREATE INDEX idx_searches_created ON public.searches(created_at DESC);
CREATE INDEX idx_searches_status ON public.searches(status);

-- =============================================================================
-- BUSINESSES (canonical business records — deduplicated)
-- =============================================================================

CREATE TABLE public.businesses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  external_id TEXT,                         -- Google Place ID or other provider ID
  provider TEXT,                            -- google, osm, yelp, etc.
  name TEXT NOT NULL,
  category TEXT,
  subcategory TEXT,
  description TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  country TEXT,
  postal_code TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  google_maps_url TEXT,
  business_hours JSONB,
  business_status TEXT,                     -- operational, closed_temporarily, permanently_closed
  year_established INTEGER,
  estimated_employees_min INTEGER,
  estimated_employees_max INTEGER,
  estimated_revenue_min BIGINT,
  estimated_revenue_max BIGINT,
  google_rating NUMERIC(2,1),
  review_count INTEGER DEFAULT 0,
  language TEXT,
  is_verified BOOLEAN DEFAULT false,
  last_verified_at TIMESTAMPTZ,
  raw_data JSONB,                           -- original provider payload
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_businesses_external ON public.businesses(provider, external_id) WHERE external_id IS NOT NULL;
CREATE INDEX idx_businesses_name_trgm ON public.businesses USING gin (name gin_trgm_ops);
CREATE INDEX idx_businesses_location ON public.businesses(country, state, city);
CREATE INDEX idx_businesses_coords ON public.businesses(latitude, longitude);
CREATE INDEX idx_businesses_category ON public.businesses(category);
CREATE INDEX idx_businesses_rating ON public.businesses(google_rating DESC NULLS LAST);

-- =============================================================================
-- CONTACTS (publicly available contact info)
-- =============================================================================

CREATE TABLE public.contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  phone TEXT,
  alternate_phones TEXT[],
  email TEXT,
  alternate_emails TEXT[],
  contact_page_url TEXT,
  booking_url TEXT,
  whatsapp TEXT,
  source TEXT,                              -- google, website, social, directory
  is_verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_contacts_business ON public.contacts(business_id);
CREATE INDEX idx_contacts_email ON public.contacts(email) WHERE email IS NOT NULL;
CREATE INDEX idx_contacts_phone ON public.contacts(phone) WHERE phone IS NOT NULL;

-- =============================================================================
-- SOCIAL PROFILES
-- =============================================================================

CREATE TABLE public.social_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,                   -- facebook, instagram, linkedin, twitter, youtube, tiktok, other
  url TEXT NOT NULL,
  username TEXT,
  followers_count INTEGER,
  is_verified BOOLEAN DEFAULT false,
  last_checked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(business_id, platform)
);

CREATE INDEX idx_social_business ON public.social_profiles(business_id);

-- =============================================================================
-- WEBSITE AUDITS
-- =============================================================================

CREATE TABLE public.website_audits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  website_url TEXT,
  status website_status NOT NULL DEFAULT 'no_website',
  quality_score INTEGER CHECK (quality_score >= 0 AND quality_score <= 100),
  audit_status audit_status NOT NULL DEFAULT 'pending',
  is_https BOOLEAN,
  is_mobile_responsive BOOLEAN,
  page_speed_score INTEGER,
  core_web_vitals JSONB,                    -- {lcp, fid, cls, ...}
  seo_score INTEGER,
  accessibility_score INTEGER,
  ui_ux_score INTEGER,
  modernity_score INTEGER,
  conversion_score INTEGER,
  has_broken_links BOOLEAN,
  has_ssl BOOLEAN,
  technologies TEXT[],                      -- detected tech stack
  weaknesses JSONB DEFAULT '[]'::jsonb,     -- array of {issue, severity, description}
  strengths JSONB DEFAULT '[]'::jsonb,
  missing_pages TEXT[],
  raw_audit_data JSONB,
  audited_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audits_business ON public.website_audits(business_id);
CREATE INDEX idx_audits_score ON public.website_audits(quality_score);
CREATE INDEX idx_audits_status ON public.website_audits(status);

-- =============================================================================
-- LEADS (user-specific view / CRM records of businesses)
-- =============================================================================

CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  search_id UUID REFERENCES public.searches(id) ON DELETE SET NULL,
  
  -- Scoring (denormalized for performance)
  lead_score INTEGER NOT NULL DEFAULT 0 CHECK (lead_score >= 0 AND lead_score <= 100),
  star_rating NUMERIC(2,1) CHECK (star_rating >= 0 AND star_rating <= 5),
  purchase_probability INTEGER CHECK (purchase_probability >= 0 AND purchase_probability <= 100),
  ai_confidence TEXT CHECK (ai_confidence IN ('low', 'medium', 'high')),
  heat_score heat_score,
  
  -- Score breakdown (stored for transparency)
  score_breakdown JSONB DEFAULT '{}'::jsonb,
  -- Example: {"website_opportunity": 25, "business_strength": 22, ...}
  
  -- AI outputs
  ai_summary TEXT,
  recommended_solution TEXT,
  opportunity_types opportunity_type[],
  website_recommendation TEXT,              -- business website, ecommerce, etc.
  website_prompt TEXT,                      -- full generation prompt
  
  -- CRM fields
  status lead_status NOT NULL DEFAULT 'new',
  is_favorite BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false,
  tags TEXT[] DEFAULT '{}',
  notes TEXT,
  follow_up_date DATE,
  last_contacted_at TIMESTAMPTZ,
  deal_value_cents INTEGER,
  
  -- Metadata
  source TEXT,                              -- search, import, manual
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(user_id, business_id)
);

CREATE INDEX idx_leads_user ON public.leads(user_id);
CREATE INDEX idx_leads_status ON public.leads(user_id, status);
CREATE INDEX idx_leads_score ON public.leads(user_id, lead_score DESC);
CREATE INDEX idx_leads_probability ON public.leads(user_id, purchase_probability DESC);
CREATE INDEX idx_leads_favorite ON public.leads(user_id, is_favorite) WHERE is_favorite = true;
CREATE INDEX idx_leads_followup ON public.leads(user_id, follow_up_date) WHERE follow_up_date IS NOT NULL;
CREATE INDEX idx_leads_search ON public.leads(search_id);
CREATE INDEX idx_leads_tags ON public.leads USING gin (tags);

-- =============================================================================
-- OUTREACH (generated emails, DMs, scripts)
-- =============================================================================

CREATE TABLE public.outreach (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  channel outreach_channel NOT NULL,
  version TEXT,                             -- professional, friendly, high_conversion
  subject TEXT,
  body TEXT NOT NULL,
  call_script JSONB,                        -- structured script with objection handling
  is_copied BOOLEAN DEFAULT false,
  is_sent BOOLEAN DEFAULT false,            -- future: actual sending
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_outreach_lead ON public.outreach(lead_id);
CREATE INDEX idx_outreach_user ON public.outreach(user_id);

-- =============================================================================
-- NOTES & ACTIVITY LOG
-- =============================================================================

CREATE TABLE public.notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notes_lead ON public.notes(lead_id);

CREATE TABLE public.activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  action TEXT NOT NULL,                     -- status_changed, note_added, email_generated, etc.
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_activity_user ON public.activity_log(user_id, created_at DESC);
CREATE INDEX idx_activity_lead ON public.activity_log(lead_id);

-- =============================================================================
-- FOLLOW-UPS
-- =============================================================================

CREATE TABLE public.followups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  scheduled_date DATE NOT NULL,
  channel outreach_channel,
  message_template TEXT,
  status TEXT NOT NULL DEFAULT 'pending',   -- pending, completed, skipped, canceled
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_followups_user_date ON public.followups(user_id, scheduled_date);
CREATE INDEX idx_followups_lead ON public.followups(lead_id);

-- =============================================================================
-- EXPORTS
-- =============================================================================

CREATE TABLE public.exports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  search_id UUID REFERENCES public.searches(id),
  file_name TEXT NOT NULL,
  file_path TEXT,                           -- Supabase Storage path
  lead_count INTEGER NOT NULL DEFAULT 0,
  filters_applied JSONB,
  status TEXT NOT NULL DEFAULT 'pending',   -- pending, completed, failed
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_exports_user ON public.exports(user_id);

-- =============================================================================
-- ADMIN SETTINGS & CONFIG
-- =============================================================================

CREATE TABLE public.admin_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES public.profiles(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default scoring weights
INSERT INTO public.admin_settings (key, value, description) VALUES
('scoring_weights', '{
  "website_opportunity": 25,
  "business_strength": 25,
  "online_activity": 20,
  "contactability": 15,
  "purchase_signals": 15
}'::jsonb, 'Lead score component weights (must sum to 100)'),
('trial_duration_hours', '24'::jsonb, 'Free trial duration in hours'),
('developer_branding', '{
  "name": "Mohammad Ashraf",
  "role": "Founder & Full-Stack Developer",
  "brand": "D-Mappers — Premium Web Studio",
  "portfolio": "",
  "linkedin": "",
  "github": "",
  "email": "",
  "website": ""
}'::jsonb, 'Developer / About section links'),
('app_branding', '{
  "app_name": "Lead Hunter AI",
  "footer_text": "Lead Hunter AI © 2026 — Developed by Mohammad Ashraf | D-Mappers",
  "support_email": ""
}'::jsonb, 'Application branding'),
('ai_settings', '{
  "model": "grok-2",
  "temperature": 0.7,
  "max_tokens": 2000
}'::jsonb, 'Default AI generation settings');

-- =============================================================================
-- SYSTEM LOGS (admin)
-- =============================================================================

CREATE TABLE public.system_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  level TEXT NOT NULL,                      -- info, warn, error, debug
  category TEXT,                            -- auth, search, ai, payment, etc.
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  user_id UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_system_logs_created ON public.system_logs(created_at DESC);
CREATE INDEX idx_system_logs_level ON public.system_logs(level);

-- =============================================================================
-- HELPER FUNCTIONS
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER subscriptions_updated_at BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER businesses_updated_at BEFORE UPDATE ON public.businesses
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER contacts_updated_at BEFORE UPDATE ON public.contacts
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER website_audits_updated_at BEFORE UPDATE ON public.website_audits
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER leads_updated_at BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER notes_updated_at BEFORE UPDATE ON public.notes
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER plans_updated_at BEFORE UPDATE ON public.plans
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER usage_updated_at BEFORE UPDATE ON public.usage
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, trial_started_at, trial_ends_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NOW(),
    NOW() + INTERVAL '24 hours'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.website_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outreach ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.followups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read/update own profile; admins can do everything
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id OR EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'ADMIN'
  ));
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Leads: strict user isolation
CREATE POLICY "Users manage own leads" ON public.leads
  FOR ALL USING (auth.uid() = user_id);

-- Searches
CREATE POLICY "Users manage own searches" ON public.searches
  FOR ALL USING (auth.uid() = user_id);

-- Outreach, notes, followups, exports, activity
CREATE POLICY "Users manage own outreach" ON public.outreach
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own notes" ON public.notes
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own followups" ON public.followups
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own exports" ON public.exports
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users view own activity" ON public.activity_log
  FOR SELECT USING (auth.uid() = user_id);

-- Businesses, contacts, social, audits are shared (read by authenticated)
CREATE POLICY "Authenticated users can read businesses" ON public.businesses
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read contacts" ON public.contacts
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read social" ON public.social_profiles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read audits" ON public.website_audits
  FOR SELECT TO authenticated USING (true);

-- Plans are public read
CREATE POLICY "Anyone can read plans" ON public.plans
  FOR SELECT USING (true);

-- Admin settings: only admins
CREATE POLICY "Admins manage settings" ON public.admin_settings
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'ADMIN'
  ));

-- System logs: only admins
CREATE POLICY "Admins view logs" ON public.system_logs
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'ADMIN'
  ));

-- Subscriptions & usage
CREATE POLICY "Users view own subscription" ON public.subscriptions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users view own usage" ON public.usage
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users view own payments" ON public.payments
  FOR SELECT USING (auth.uid() = user_id);

-- =============================================================================
-- SEED DEFAULT PLANS
-- =============================================================================

INSERT INTO public.plans (tier, name, description, price_monthly_cents, price_yearly_cents, max_searches_per_month, max_leads_per_month, max_exports_per_month, max_team_members, features, sort_order) VALUES
('free_trial', 'Free Trial', '1-day full access trial', 0, 0, 5, 25, 2, 1, '["All features for 24 hours"]', 0),
('starter', 'Starter', 'For individuals & freelancers just starting', 2900, 29000, 30, 150, 10, 1, '["Lead search", "Website analysis", "AI outreach", "Excel export"]', 1),
('professional', 'Professional', 'For serious freelancers and small agencies', 7900, 79000, 100, 500, 50, 3, '["Everything in Starter", "Higher limits", "Priority support", "Team seats"]', 2),
('business', 'Business', 'For growing agencies and teams', 19900, 199000, 500, 2500, 200, 10, '["Everything in Professional", "Advanced analytics", "API access", "Custom scoring"]', 3),
('enterprise', 'Enterprise', 'Custom limits, SLA, dedicated support', 0, 0, NULL, NULL, NULL, NULL, '["Unlimited", "Custom integrations", "Dedicated account manager", "SSO"]', 4);

-- =============================================================================
-- VIEWS (useful for dashboard)
-- =============================================================================

CREATE OR REPLACE VIEW public.lead_dashboard_stats AS
SELECT
  user_id,
  COUNT(*) AS total_leads,
  COUNT(*) FILTER (WHERE status = 'new') AS new_leads,
  COUNT(*) FILTER (WHERE status = 'contacted') AS contacted,
  COUNT(*) FILTER (WHERE status = 'interested') AS interested,
  COUNT(*) FILTER (WHERE status = 'follow_up') AS follow_ups,
  COUNT(*) FILTER (WHERE status = 'proposal_sent') AS proposals,
  COUNT(*) FILTER (WHERE status = 'won') AS won,
  COUNT(*) FILTER (WHERE status = 'lost') AS lost,
  COUNT(*) FILTER (WHERE is_favorite = true) AS favorites,
  ROUND(AVG(lead_score)) AS avg_lead_score,
  ROUND(AVG(purchase_probability)) AS avg_purchase_probability,
  COUNT(*) FILTER (WHERE heat_score = 'very_hot') AS very_hot_count
FROM public.leads
WHERE is_archived = false
GROUP BY user_id;

-- Grant access
GRANT SELECT ON public.lead_dashboard_stats TO authenticated;
