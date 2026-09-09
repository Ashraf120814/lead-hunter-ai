# Lead Hunter AI — Architecture Overview

## 1. High-Level System Design

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (Next.js App Router)              │
│  Dashboard · Find Leads · Lead Detail · CRM · Analytics · Admin │
└────────────────────────────┬────────────────────────────────────┘
                             │ Server Actions / API Routes
┌────────────────────────────▼────────────────────────────────────┐
│                     API LAYER (/api/*)                          │
│  Auth · Leads · Search · Audit · AI · Subscription · Admin      │
└──────┬──────────────┬──────────────┬──────────────┬─────────────┘
       │              │              │              │
┌──────▼──────┐ ┌─────▼─────┐ ┌──────▼──────┐ ┌─────▼──────┐
│  Supabase   │ │  Provider │ │  AI Agents  │ │  Stripe /  │
│  Postgres   │ │  Layer    │ │  (modular)  │ │  Razorpay  │
│  + Auth     │ │           │ │             │ │            │
│  + Storage  │ │ Maps      │ │ Discovery   │ │            │
│  + RLS      │ │ Audit     │ │ Intelligence│ │            │
└─────────────┘ │ Social    │ │ Qualification│ └────────────┘
                │ Email     │ │ Sales       │
                └───────────┘ │ Prompt Gen  │
                              │ Ranking     │
                              └─────────────┘
```

## 2. Database (Supabase PostgreSQL)

Full schema lives in `supabase/schema.sql`.

### Core Tables
| Table              | Purpose                                      |
|--------------------|----------------------------------------------|
| profiles           | Extends auth.users (role, trial, theme)      |
| plans              | Subscription tiers (configurable)            |
| subscriptions      | User plan + Stripe/Razorpay IDs              |
| usage              | Monthly quota tracking                       |
| searches           | Search history + filters + progress          |
| businesses         | Canonical, deduplicated business records     |
| contacts           | Public phones, emails, WhatsApp              |
| social_profiles    | Facebook, Instagram, LinkedIn, etc.          |
| website_audits     | Quality score + weaknesses + tech            |
| leads              | User CRM records + scores + AI outputs       |
| outreach           | Generated emails, DMs, call scripts          |
| notes              | Free-form lead notes                         |
| followups          | Scheduled follow-up tasks                    |
| exports            | Excel export history                         |
| admin_settings     | Scoring weights, branding, AI config         |
| system_logs        | Audit trail for admins                       |
| activity_log       | Per-user lead activity                       |

### Key Design Decisions
- **Businesses are shared** (read by all authenticated users). Leads are **user-scoped**.
- **Deduplication** via unique `(provider, external_id)`.
- **Row Level Security** enforced on every table.
- **Score breakdown stored** as JSONB for transparency.
- **Trial auto-created** on signup via trigger (24 hours default).

## 3. Scoring Engine

Location: `src/lib/scoring/`

### Components (default weights — configurable in admin)
| Component              | Max Points | Signal Sources                                      |
|------------------------|------------|-----------------------------------------------------|
| Website Opportunity    | 25         | No website / poor quality / outdated / broken       |
| Business Strength      | 25         | Google rating, review count, size, longevity        |
| Online Activity        | 20         | Social profile count & platforms                    |
| Contactability         | 15         | Phone, email, WhatsApp, booking link                |
| Purchase Signals       | 15         | Strong offline + weak digital, industry maturity    |

### Outputs
- `lead_score` (0–100)
- `star_rating` (1–5)
- `purchase_probability` (0–100) — **explicitly an estimate**
- `ai_confidence` (low / medium / high)
- `heat_score` (very_hot / hot / warm / cold)
- `opportunity_types[]`
- `recommended_solution`

The engine is a pure function (`calculateLeadScore`). It never invents data.

## 4. AI Agent Architecture (Modular)

Each agent is a separate module that can be swapped or improved independently.

| Agent                    | Responsibility                                      |
|--------------------------|-----------------------------------------------------|
| Lead Discovery Agent     | Convert filters / NL query → provider calls         |
| Business Intelligence    | Enrich business data, detect digital gaps           |
| Website Audit Agent      | Run audit, compute quality score & weaknesses       |
| Qualification Agent      | Call scoring engine + generate summary              |
| Sales Agent              | Personalized email / DM / call script               |
| Website Strategy Agent   | Recommend website type & features                   |
| Website Prompt Agent     | Generate full AI website builder prompt             |
| Lead Ranking Agent       | Sort & recommend top leads for the day              |

All AI calls go through a single `AIProvider` abstraction so the underlying model (Grok, OpenAI, etc.) can be changed via env / admin settings.

## 5. Data Provider Abstraction

```ts
interface MapsProvider {
  searchBusinesses(filters: SearchFilters): Promise<RawBusiness[]>;
  getPlaceDetails(id: string): Promise<RawBusiness>;
}

interface WebsiteAuditProvider {
  audit(url: string): Promise<AuditResult>;
}

interface SocialProvider {
  findProfiles(businessName: string, location: string): Promise<SocialProfile[]>;
}
```

Concrete implementations (Google Places, SerpAPI, PageSpeed Insights, OpenStreetMap, etc.) are injected at runtime. This prevents vendor lock-in and allows graceful degradation.

## 6. Authentication & Authorization

- Supabase Auth (email/password + Google OAuth)
- Roles: `ADMIN` | `USER` | `TEAM_ADMIN` | `TEAM_MEMBER`
- Trial: auto 24h on signup (configurable)
- Protected routes via middleware + RLS
- Admin routes require `role === 'ADMIN'`

## 7. Subscription & Quotas

- Plans stored in DB (prices, limits fully editable by admin)
- Usage tracked per calendar month in `usage` table
- Soft limits checked before expensive operations (search, audit, export)
- Stripe / Razorpay via environment variables only (never hard-coded)

## 8. Frontend Routes (planned)

```
/                     → redirect to /dashboard or /login
/login
/register
/forgot-password
/reset-password
/dashboard
/leads/find
/leads/[id]
/leads/saved
/crm
/search-history
/outreach
/exports
/analytics
/subscription
/settings
/admin                  (ADMIN only)
/admin/users
/admin/subscriptions
/admin/settings
/admin/logs
```

## 9. Security Checklist

- [x] RLS on all tables
- [x] Server-side API keys only
- [x] Input validation (Zod recommended)
- [x] Rate limiting stubs
- [x] CSRF protection via Next.js
- [x] No fabricated contact data
- [x] Clear separation of Verified vs Estimated data
- [ ] Production rate limits (Upstash / Redis)
- [ ] Audit logging for admin actions

## 10. Next Implementation Steps

1. ✅ Database schema
2. ✅ Core TypeScript types
3. ✅ Scoring engine + config
4. → Install remaining dependencies (Supabase, Zod, ExcelJS, Recharts, etc.)
5. → Supabase client + auth helpers
6. → Mock data layer for rapid UI development
7. → Core UI pages (Dashboard, Find Leads, Lead Detail)
8. → AI generation templates (email, DM, call script, website prompt)
9. → Excel export
10. → Admin panel + settings
11. → Real provider integrations (behind feature flags)
12. → Stripe subscription flow
13. → Production hardening & testing

## 11. Core Services (Implemented)

| Service | Path | Responsibility |
|---------|------|----------------|
| Lead Discovery | `src/lib/services/lead-discovery.ts` | Full FIND → ENRICH → AUDIT → SCORE → AI pipeline |
| NL Parser | `src/lib/services/nl-parser.ts` | Natural language → structured SearchFilters |
| Quota | `src/lib/services/quota.ts` | Plan limits + trial expiration checks |
| Excel Export | `src/lib/export/excel.ts` | Flat rows + ExcelJS workbook generation |
| Auth Helpers | `src/lib/auth/helpers.ts` | getCurrentUser, requireAuth, requireRole |
| Middleware | `src/middleware.ts` | Route protection stubs + security headers |

### Discovery Pipeline Flow

```
SearchFilters
    ↓
MapsProvider.searchBusinesses()
    ↓
For each business (parallel enrichment):
    ContactProvider + SocialProvider + WebsiteAuditProvider
    ↓
calculateLeadScore()
    ↓
QualificationAgent + WebsiteStrategyAgent
    ↓
DiscoveredLead[]  (sorted by lead_score)
```

## 12. Foundation Completeness Checklist

- [x] Database schema + RLS + seeds
- [x] Core TypeScript types
- [x] Scoring engine (configurable, tested)
- [x] Provider abstraction + mock implementations
- [x] AI agents (Qualification, Sales, Website, Ranking)
- [x] Lead discovery orchestration
- [x] Natural language query parser
- [x] Quota / subscription helpers
- [x] Auth helpers + middleware stub
- [x] Excel export structure
- [x] Env config + .env.example
- [x] Utility formatters + cn()
- [ ] Real Supabase connection + migrations applied
- [ ] Real LLM provider (Grok/OpenAI)
- [ ] Real Maps / PageSpeed providers
- [ ] Stripe / Razorpay integration
- [ ] UI pages
- [ ] API routes
