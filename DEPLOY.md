# Deploy Lead Hunter AI

## Option A — Vercel (recommended)

### 1. Push code to GitHub

```bash
cd lead-hunter-ai
git init
git add .
git commit -m "Lead Hunter AI"
# Create a repo on GitHub, then:
git remote add origin https://github.com/YOUR_USER/lead-hunter-ai.git
git branch -M main
git push -u origin main
```

### 2. Import on Vercel

1. Go to https://vercel.com/new
2. Import the GitHub repository
3. Framework: **Next.js** (auto-detected)
4. Root directory: leave default

### 3. Environment variables (Vercel → Project → Settings → Environment Variables)

| Name | Value | Required |
|------|--------|----------|
| `USE_MOCK_PROVIDERS` | `false` | Yes for real data |
| `GOOGLE_MAPS_API_KEY` | your Google Cloud API key | Yes for real businesses |
| `NEXT_PUBLIC_APP_URL` | `https://your-app.vercel.app` | Recommended |
| `XAI_API_KEY` or `OPENAI_API_KEY` | optional | For live LLM later |
| `NEXT_PUBLIC_SUPABASE_URL` | optional | When using Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | optional | When using Supabase |

### 4. Google Cloud setup (real clients)

1. Open https://console.cloud.google.com/
2. Create/select a project
3. Enable **Places API (New)** (and optionally **PageSpeed Insights API**)
4. Create an API key → restrict by HTTP referrer (your Vercel domain) and by API
5. Put the key in Vercel as `GOOGLE_MAPS_API_KEY`
6. Set `USE_MOCK_PROVIDERS=false`

Billing must be enabled on the Google project (Places has a free monthly credit, then pay-as-you-go).

### 5. Deploy

Click **Deploy**. After build succeeds, open:

- `/` — landing
- `/leads/find` — search real businesses

### 6. CLI alternative

```bash
npm i -g vercel
cd lead-hunter-ai
vercel login
vercel
vercel env add GOOGLE_MAPS_API_KEY
vercel env add USE_MOCK_PROVIDERS
# value: false
vercel --prod
```

---

## Option B — Any Node host (Docker / VPS)

```bash
npm install
npm run build
npm run start
# listens on PORT (default 3000)
```

Set the same env vars on the host.

---

## Verify real data

1. Open `/leads/find`
2. Search e.g. City: `Dubai`, Category: `Jewellery`, Website: `No website`
3. Header should show **Live Google Places** when the key is active
4. Results should be real business names, ratings, phones, and Maps links from Google

If you see **Demo data**, `USE_MOCK_PROVIDERS` is still `true` or the Google key is missing.

---

## Important

- Never commit API keys. Use host env vars only.
- Do not invent emails or phones. Google Places provides public phone/website when available.
- Social profiles stay limited until you add a licensed enrichment API.
- Full CRM, auth, and Stripe can be enabled after the core search flow is live.
