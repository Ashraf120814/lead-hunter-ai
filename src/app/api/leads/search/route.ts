import { NextRequest, NextResponse } from "next/server";
import { discoverLeads } from "@/lib/services/lead-discovery";
import { parseNaturalLanguageQuery } from "@/lib/services/nl-parser";
import type { SearchFilters } from "@/types";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    let filters: SearchFilters = body.filters || {};

    if (body.query && typeof body.query === "string") {
      const parsed = parseNaturalLanguageQuery(body.query);
      filters = { ...parsed.filters, ...filters };
    }

    const limit = Math.min(Number(body.limit) || 10, 20);

    const leads = await discoverLeads(filters, { limit });

    return NextResponse.json({
      ok: true,
      count: leads.length,
      leads: leads.map((d) => ({
        business: {
          id: d.business.id,
          name: d.business.name,
          category: d.business.category,
          address: d.business.address,
          city: d.business.city,
          state: d.business.state,
          country: d.business.country,
          google_rating: d.business.google_rating,
          review_count: d.business.review_count,
          google_maps_url: d.business.google_maps_url,
          external_id: d.business.external_id,
          provider: d.business.provider,
        },
        contact: d.contact
          ? {
              phone: d.contact.phone,
              email: d.contact.email,
              whatsapp: d.contact.whatsapp,
            }
          : null,
        // Phone often comes from Google Places on the business raw payload
        phone:
          d.contact?.phone ||
          (d.business as { phone?: string }).phone ||
          null,
        socialProfiles: d.socialProfiles.map((s) => ({
          platform: s.platform,
          url: s.url,
        })),
        audit: {
          website_url: d.audit.website_url,
          status: d.audit.status,
          quality_score: d.audit.quality_score,
          weaknesses: d.audit.weaknesses?.slice(0, 5) || [],
        },
        scoring: {
          leadScore: d.scoring.leadScore,
          starRating: d.scoring.starRating,
          purchaseProbability: d.scoring.purchaseProbability,
          aiConfidence: d.scoring.aiConfidence,
          heatScore: d.scoring.heatScore,
          breakdown: d.scoring.breakdown,
        },
        aiSummary: d.aiSummary,
        recommendedSolution: d.recommendedSolution,
        websitePrompt: d.websitePrompt,
        opportunityTypes: d.opportunityTypes,
      })),
      mode:
        process.env.USE_MOCK_PROVIDERS === "true"
          ? "mock"
          : process.env.GOOGLE_MAPS_API_KEY
            ? "google_places"
            : "mock_fallback",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Search failed";
    console.error("[/api/leads/search]", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
