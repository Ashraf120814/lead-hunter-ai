# Lead Hunter AI

AI-powered global business lead discovery, website analysis, qualification, outreach, and sales-assistance platform.

**Stack:** Next.js (App Router) · TypeScript · Tailwind · Supabase · Modular AI Agents

---

## Current Status

| Layer | Status |
|-------|--------|
| Database schema (Supabase/PostgreSQL) | Done |
| Core types | Done |
| Scoring engine | Done |
| Provider abstraction + mocks | Done |
| AI agents (Qualification, Sales, Website, Ranking) | Done |
| Lead discovery pipeline | Done |
| NL query parser | Done |
| Quota / auth helpers | Done |
| Excel export | Done |
| UI pages (Dashboard, Find Leads, etc.) | In progress |
| Real API providers (Google, Stripe, Grok) | Optional |

The **backend foundation is fully usable**. You can call the discovery pipeline, scoring, and AI generators from code or API routes even before the full UI is finished.

---

## 1. Prerequisites

- **Node.js** 18+ (20+ recommended)
- **npm** 9+ (or pnpm / yarn)
- Optional: a free [Supabase](https://supabase.com) project
- Optional: API keys for Google Places, xAI/OpenAI, Stripe (only when leaving mock mode)

---

## 2. Install

```bash
cd lead-hunter-ai
npm install
```

If install is slow:

```bash
npm install --prefer-offline --no-audit --no-fund
```

---

## 3. Environment

```bash
cp .env.example .env.local
```

**Minimum for local development (mock mode):**

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
USE_MOCK_PROVIDERS=true
```

Leave Supabase / Google / Stripe keys empty. The app uses realistic mock businesses, audits, and AI templates.

**When you want a real database:**

1. Create a Supabase project.
2. In the SQL Editor, paste and run `supabase/schema.sql`.
3. Fill in:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
USE_MOCK_PROVIDERS=true
```

**When you want real AI / maps later:**

```env
XAI_API_KEY=xai-...
OPENAI_API_KEY=sk-...
GOOGLE_MAPS_API_KEY=...
USE_MOCK_PROVIDERS=false
```

---

## 4. Run

```bash
npm run dev
```

Open http://localhost:3000

Other scripts:

```bash
npm run build
npm run start
npm run test:scoring
npm run lint
```

---

## 5. How to Use (Developer)

### Discover leads (full pipeline)

```ts
import { discoverLeads } from '@/lib/services/lead-discovery';
import { parseNaturalLanguageQuery } from '@/lib/services/nl-parser';

// Structured filters
const leads = await discoverLeads({
  location: { city: 'Dubai', country: 'United Arab Emirates' },
  category: 'Jewellery Store',
  website_status: 'no_website',
  rating_min: 4.0,
}, { limit: 10 });

// Natural language
const { filters } = parseNaturalLanguageQuery(
  'Find jewellery stores in Dubai without websites'
);
const leads2 = await discoverLeads(filters, { limit: 10 });
```

Each lead includes: business, contact, socialProfiles, audit, scoring, aiSummary, websitePrompt, recommendedSolution, opportunityTypes.

### Score a business

```ts
import { calculateLeadScore } from '@/lib/scoring';

const result = calculateLeadScore({
  websiteStatus: 'no_website',
  websiteQualityScore: null,
  hasWebsite: false,
  googleRating: 4.7,
  reviewCount: 843,
  category: 'Jewellery',
  socialProfilesCount: 2,
  hasInstagram: true,
  hasFacebook: true,
  hasLinkedIn: false,
  hasActiveSocial: true,
  hasPhone: true,
  hasEmail: false,
  hasWhatsApp: true,
  hasBookingLink: false,
});
// result.leadScore, starRating, purchaseProbability, heatScore, breakdown
```

### Generate outreach

```ts
import { agents } from '@/lib/ai';

const emails = await agents.sales.generateEmails({ business, audit, scoring, contact, socialProfiles });
const messages = await agents.sales.generateMessages({ ... });
const callScript = await agents.sales.generateCallScript({ ... });
const prompt = await agents.websiteStrategy.generateWebsitePrompt({ ... });
```

### Export to Excel

```ts
import { discoveredToExportRows, buildExcelBuffer } from '@/lib/export/excel';

const rows = discoveredToExportRows(leads, 'Dubai, UAE', 'jewellery no website');
const buffer = await buildExcelBuffer(rows);
```

### Check quotas

```ts
import { checkQuota } from '@/lib/services/quota';

const check = checkQuota('search', plan, usage, subscription);
if (!check.allowed) {
  // show check.reason
}
```

---

## 6. Project Structure

```
lead-hunter-ai/
├── supabase/schema.sql
├── docs/ARCHITECTURE.md
├── .env.example
├── src/
│   ├── app/
│   ├── components/
│   ├── config/env.ts
│   ├── types/
│   ├── middleware.ts
│   └── lib/
│       ├── scoring/
│       ├── providers/
│       ├── ai/agents/
│       ├── services/
│       ├── auth/
│       ├── export/
│       ├── supabase/
│       ├── validations/
│       └── utils/
```

---

## 7. Mock Data (no API keys needed)

| Business | Location | Website | Rating |
|----------|----------|---------|--------|
| Al Noor Jewellery | Dubai | None | 4.7 (843 reviews) |
| Bella Cucina Trattoria | Chicago | Poor | 4.6 |
| Harley Street Dental Studio | London | None | 4.9 |
| Glow Beauty Lounge | Los Angeles | Average | 4.5 |
| Precision Auto Care | New York | None | 4.4 |
| Morning Brew Café | Toronto | Poor | 4.3 |
| Royal Diamond House | Dubai | Good | 4.8 |
| Wellness Family Clinic | San Francisco | None | 4.6 |

Filters for city, category, website status, rating, and reviews work against this set.

---

## 8. Product Workflow

1. **Find** — Location + industry + website condition  
2. **Analyze** — Website audit + scoring  
3. **Qualify** — Lead score, purchase probability, heat, AI summary  
4. **Pitch** — Email / DM / call script / website prompt  
5. **Save** — CRM status, notes, follow-up  
6. **Export** — Excel  
7. **Close** — Track won/lost  

---

## 9. Production Checklist

1. Run `supabase/schema.sql` on a real Supabase project  
2. Set real env vars; set `USE_MOCK_PROVIDERS=false` when ready  
3. Wire real providers (Google Places, PageSpeed, Grok) into existing interfaces  
4. Add Stripe or Razorpay using existing subscription tables  
5. Finish UI pages and API routes  
6. Harden middleware and rate limits  
7. `npm run build` and deploy  

---

## Developer

Mohammad Ashraf · D-Mappers — Premium Web Studio  

See `docs/ARCHITECTURE.md` for system design details.
