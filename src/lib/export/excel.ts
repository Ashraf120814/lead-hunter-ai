// =============================================================================
// Excel Export Utility (ExcelJS)
// =============================================================================

import type { DiscoveredLead } from '@/lib/services/lead-discovery';
import type { Lead, Business, Contact, WebsiteAudit } from '@/types';
import { locationString, websiteStatusLabel, heatLabel, statusLabel } from '@/lib/utils/format';

export interface ExportLeadRow {
  leadId: string;
  businessName: string;
  category: string;
  country: string;
  state: string;
  city: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  websiteStatus: string;
  websiteScore: string;
  googleRating: string;
  reviewCount: number;
  socialLinks: string;
  leadScore: number;
  starRating: number;
  purchaseProbability: number;
  aiConfidence: string;
  heatScore: string;
  businessSummary: string;
  recommendedSolution: string;
  leadStatus: string;
  dateFound: string;
  searchLocation: string;
  searchQuery: string;
}

/**
 * Map a discovered lead (or persisted lead + relations) into a flat export row.
 */
export function toExportRow(
  data: {
    lead?: Partial<Lead>;
    business: Business;
    contact?: Contact | null;
    audit?: WebsiteAudit | null;
    socialUrls?: string[];
    searchLocation?: string;
    searchQuery?: string;
  }
): ExportLeadRow {
  const { lead, business, contact, audit, socialUrls = [], searchLocation = '', searchQuery = '' } = data;

  return {
    leadId: lead?.id ?? business.id,
    businessName: business.name,
    category: business.category ?? '',
    country: business.country ?? '',
    state: business.state ?? '',
    city: business.city ?? '',
    address: business.address ?? '',
    phone: contact?.phone ?? 'Not found',
    email: contact?.email ?? 'Not found',
    website: audit?.website_url ?? 'Not found',
    websiteStatus: audit ? websiteStatusLabel(audit.status) : 'Unknown',
    websiteScore: audit?.quality_score != null ? String(audit.quality_score) : '—',
    googleRating: business.google_rating != null ? String(business.google_rating) : '—',
    reviewCount: business.review_count ?? 0,
    socialLinks: socialUrls.join(' | ') || 'None found',
    leadScore: lead?.lead_score ?? 0,
    starRating: lead?.star_rating ?? 0,
    purchaseProbability: lead?.purchase_probability ?? 0,
    aiConfidence: lead?.ai_confidence ?? '',
    heatScore: heatLabel(lead?.heat_score),
    businessSummary: lead?.ai_summary ?? '',
    recommendedSolution: lead?.recommended_solution ?? '',
    leadStatus: lead?.status ? statusLabel(lead.status) : 'New',
    dateFound: lead?.created_at ?? new Date().toISOString(),
    searchLocation: searchLocation || locationString(business),
    searchQuery,
  };
}

/**
 * Convert discovered leads (in-memory) to export rows.
 */
export function discoveredToExportRows(
  leads: DiscoveredLead[],
  searchLocation = '',
  searchQuery = ''
): ExportLeadRow[] {
  return leads.map((d) =>
    toExportRow({
      lead: {
        lead_score: d.scoring.leadScore,
        star_rating: d.scoring.starRating,
        purchase_probability: d.scoring.purchaseProbability,
        ai_confidence: d.scoring.aiConfidence,
        heat_score: d.scoring.heatScore,
        ai_summary: d.aiSummary,
        recommended_solution: d.recommendedSolution,
        status: 'new',
        created_at: new Date().toISOString(),
      },
      business: d.business,
      contact: d.contact,
      audit: d.audit,
      socialUrls: d.socialProfiles.map((s) => s.url),
      searchLocation,
      searchQuery,
    })
  );
}

/**
 * Build an ExcelJS workbook buffer from export rows.
 * Call this from an API route; do not import ExcelJS in client components.
 */
export async function buildExcelBuffer(rows: ExportLeadRow[]): Promise<Buffer> {
  // Dynamic import so the module is only loaded server-side
  const ExcelJS = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Lead Hunter AI';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Leads', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  // Columns matching the required export format
  sheet.columns = [
    { header: 'Lead ID', key: 'leadId', width: 28 },
    { header: 'Business Name', key: 'businessName', width: 28 },
    { header: 'Category', key: 'category', width: 18 },
    { header: 'Country', key: 'country', width: 18 },
    { header: 'State', key: 'state', width: 14 },
    { header: 'City', key: 'city', width: 14 },
    { header: 'Address', key: 'address', width: 30 },
    { header: 'Phone', key: 'phone', width: 18 },
    { header: 'Email', key: 'email', width: 28 },
    { header: 'Website', key: 'website', width: 32 },
    { header: 'Website Status', key: 'websiteStatus', width: 14 },
    { header: 'Website Score', key: 'websiteScore', width: 12 },
    { header: 'Google Rating', key: 'googleRating', width: 12 },
    { header: 'Review Count', key: 'reviewCount', width: 12 },
    { header: 'Social Links', key: 'socialLinks', width: 40 },
    { header: 'Lead Score', key: 'leadScore', width: 12 },
    { header: 'Star Rating', key: 'starRating', width: 12 },
    { header: 'Purchase Probability', key: 'purchaseProbability', width: 16 },
    { header: 'AI Confidence', key: 'aiConfidence', width: 12 },
    { header: 'Heat Score', key: 'heatScore', width: 12 },
    { header: 'Business Summary', key: 'businessSummary', width: 50 },
    { header: 'Recommended Solution', key: 'recommendedSolution', width: 28 },
    { header: 'Lead Status', key: 'leadStatus', width: 14 },
    { header: 'Date Found', key: 'dateFound', width: 22 },
    { header: 'Search Location', key: 'searchLocation', width: 24 },
    { header: 'Search Query', key: 'searchQuery', width: 30 },
  ];

  // Style header
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E293B' },
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  headerRow.height = 22;

  // Add data
  rows.forEach((row) => {
    sheet.addRow(row);
  });

  // Auto-filter
  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: sheet.columnCount },
  };

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
