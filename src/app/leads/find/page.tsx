"use client";

import { useState } from "react";
import Link from "next/link";

type LeadResult = {
  business: {
    name: string;
    category: string | null;
    city: string | null;
    state: string | null;
    country: string | null;
    address: string | null;
    google_rating: number | null;
    review_count: number;
    google_maps_url: string | null;
  };
  phone: string | null;
  contact: { phone: string | null; email: string | null } | null;
  audit: {
    website_url: string | null;
    status: string;
    quality_score: number | null;
    weaknesses: Array<{ issue: string; severity: string; description: string }>;
  };
  scoring: {
    leadScore: number;
    starRating: number;
    purchaseProbability: number;
    heatScore: string;
    aiConfidence: string;
  };
  aiSummary: string;
  recommendedSolution: string;
  websitePrompt: string;
  opportunityTypes: string[];
};

export default function FindLeadsPage() {
  const [city, setCity] = useState("Dubai");
  const [country, setCountry] = useState("United Arab Emirates");
  const [category, setCategory] = useState("Jewellery Store");
  const [websiteStatus, setWebsiteStatus] = useState("no_website");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<string | null>(null);
  const [leads, setLeads] = useState<LeadResult[]>([]);
  const [selected, setSelected] = useState<LeadResult | null>(null);

  async function runSearch() {
    setLoading(true);
    setError(null);
    setSelected(null);
    try {
      const res = await fetch("/api/leads/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: query || undefined,
          filters: {
            location: { city: city || undefined, country: country || undefined },
            category: category || undefined,
            website_status: websiteStatus || undefined,
          },
          limit: 10,
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Search failed");
      setLeads(data.leads || []);
      setMode(data.mode);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Search failed");
      setLeads([]);
    } finally {
      setLoading(false);
    }
  }

  function heatEmoji(h: string) {
    if (h === "very_hot") return "🔥";
    if (h === "hot") return "🟠";
    if (h === "warm") return "🟡";
    return "🔵";
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="font-semibold flex items-center gap-2">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-indigo-600 text-white text-xs">LH</span>
            Lead Hunter AI
          </Link>
          <span className="text-xs text-slate-500">
            {mode === "google_places" ? "Live Google Places" : mode === "mock" ? "Demo data" : ""}
          </span>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8 grid lg:grid-cols-[320px_1fr] gap-6">
        <aside className="space-y-4">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3">
            <h2 className="font-semibold">Find businesses</h2>
            <label className="block text-xs text-slate-500">Natural language (optional)</label>
            <input
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm"
              placeholder="e.g. dentists in London without websites"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <label className="block text-xs text-slate-500">City</label>
            <input
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
            <label className="block text-xs text-slate-500">Country</label>
            <input
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
            />
            <label className="block text-xs text-slate-500">Industry / category</label>
            <input
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            />
            <label className="block text-xs text-slate-500">Website</label>
            <select
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm"
              value={websiteStatus}
              onChange={(e) => setWebsiteStatus(e.target.value)}
            >
              <option value="no_website">No website</option>
              <option value="exists">Has website</option>
              <option value="">Any</option>
            </select>
            <button
              onClick={runSearch}
              disabled={loading}
              className="w-full rounded-xl bg-indigo-600 text-white py-2.5 text-sm font-medium hover:bg-indigo-500 disabled:opacity-60"
            >
              {loading ? "Searching & analyzing…" : "Find leads"}
            </button>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <p className="text-[11px] text-slate-500">
              Add GOOGLE_MAPS_API_KEY on the host for real businesses. Without it, demo data is used.
            </p>
          </div>
        </aside>

        <section className="space-y-4">
          {leads.length === 0 && !loading && (
            <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-10 text-center text-slate-500 text-sm">
              Set filters and click Find leads. Results show score, website status, and outreach assets.
            </div>
          )}

          {leads.map((lead, i) => (
            <article
              key={i}
              className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold">{lead.business.name}</h3>
                  <p className="text-sm text-slate-500">
                    {[lead.business.category, lead.business.city, lead.business.country]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                <div className="text-right text-sm">
                  <div className="font-semibold">
                    {heatEmoji(lead.scoring.heatScore)} Score {lead.scoring.leadScore}/100
                  </div>
                  <div className="text-slate-500">
                    {"★".repeat(Math.round(lead.scoring.starRating))}
                    {"☆".repeat(5 - Math.round(lead.scoring.starRating))} · Buy{" "}
                    {lead.scoring.purchaseProbability}%
                  </div>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-600 dark:text-slate-400">
                <span>
                  Website: {lead.audit.status}
                  {lead.audit.quality_score != null ? ` (${lead.audit.quality_score}/100)` : ""}
                </span>
                {lead.business.google_rating != null && (
                  <span>
                    Google {lead.business.google_rating}★ ({lead.business.review_count} reviews)
                  </span>
                )}
                {(lead.phone || lead.contact?.phone) && (
                  <span>📞 {lead.phone || lead.contact?.phone}</span>
                )}
                {lead.contact?.email && <span>✉ {lead.contact.email}</span>}
              </div>

              <p className="mt-3 text-sm text-slate-700 dark:text-slate-300 line-clamp-3">
                {lead.aiSummary}
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setSelected(selected === lead ? null : lead)}
                  className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-1.5 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  {selected === lead ? "Hide details" : "View pitch assets"}
                </button>
                {lead.business.google_maps_url && (
                  <a
                    href={lead.business.google_maps_url}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-1.5 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    Open Maps
                  </a>
                )}
              </div>

              {selected === lead && (
                <div className="mt-4 space-y-3 border-t border-slate-100 dark:border-slate-800 pt-4">
                  <div>
                    <div className="text-xs font-semibold text-slate-500 mb-1">Recommended solution</div>
                    <p className="text-sm">{lead.recommendedSolution}</p>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-500 mb-1">Website builder prompt</div>
                    <textarea
                      readOnly
                      className="w-full h-40 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-3 font-mono"
                      value={lead.websitePrompt}
                    />
                    <button
                      type="button"
                      className="mt-2 text-xs text-indigo-600 font-medium"
                      onClick={() => navigator.clipboard.writeText(lead.websitePrompt)}
                    >
                      Copy website prompt
                    </button>
                  </div>
                  {lead.audit.weaknesses?.length > 0 && (
                    <div>
                      <div className="text-xs font-semibold text-slate-500 mb-1">Website weaknesses</div>
                      <ul className="text-xs space-y-1 text-slate-600 dark:text-slate-400">
                        {lead.audit.weaknesses.map((w, wi) => (
                          <li key={wi}>
                            · {w.issue} ({w.severity})
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </article>
          ))}
        </section>
      </div>
    </div>
  );
}
