// =============================================================================
// Website Strategy + Prompt Agent
// Generates a complete, copy-paste-ready prompt for AI website builders.
// =============================================================================

import type { WebsiteStrategyAgent, BusinessContext, WebsitePromptResult } from './types';
import { recommendWebsiteType } from '@/lib/scoring/config';

function b(ctx: BusinessContext) {
  return ctx.business as any;
}

export const websiteStrategyAgent: WebsiteStrategyAgent = {
  async recommendSolution(ctx: BusinessContext) {
    return recommendWebsiteType(b(ctx).category, (ctx.audit as any)?.status);
  },

  async generateWebsitePrompt(ctx: BusinessContext): Promise<WebsitePromptResult> {
    const biz = b(ctx);
    const name = biz.name || 'Business';
    const category = biz.category || 'Local Business';
    const city = biz.city || '';
    const country = biz.country || '';
    const location = [city, country].filter(Boolean).join(', ');
    const rating = biz.googleRating;
    const reviews = biz.reviewCount;
    const description = biz.description || '';
    const noWebsite = !(ctx.audit as any)?.url && (ctx.audit as any)?.status === 'no_website';
    const solution = recommendWebsiteType(category, (ctx.audit as any)?.status);

    const isEcommerce =
      solution.toLowerCase().includes('ecommerce') ||
      category.toLowerCase().includes('jewellery') ||
      category.toLowerCase().includes('jewelry') ||
      category.toLowerCase().includes('retail');

    const isBooking =
      solution.toLowerCase().includes('booking') ||
      category.toLowerCase().includes('dental') ||
      category.toLowerCase().includes('clinic') ||
      category.toLowerCase().includes('salon') ||
      category.toLowerCase().includes('restaurant') ||
      category.toLowerCase().includes('hotel');

    const pages = [
      'Home',
      'About',
      'Services / Products',
      ...(isEcommerce ? ['Shop / Catalog', 'Product Detail', 'Cart', 'Checkout'] : []),
      ...(isBooking ? ['Book Appointment / Reservation'] : []),
      'Gallery / Portfolio',
      'Testimonials / Reviews',
      'Contact',
      'FAQ',
    ];

    const designDirection = isEcommerce
      ? 'Luxury, clean, high-end product photography focus, generous whitespace, elegant typography'
      : isBooking
        ? 'Trust-focused, calm colors, clear CTAs, professional medical/service aesthetic'
        : 'Modern, conversion-oriented, mobile-first, strong local trust signals';

    const colorHint = category.toLowerCase().includes('jewell')
      ? 'Deep navy, gold accents, soft ivory, black'
      : category.toLowerCase().includes('dental') || category.toLowerCase().includes('clinic')
        ? 'Clean white, soft blue, teal accents'
        : category.toLowerCase().includes('restaurant')
          ? 'Warm terracotta, cream, charcoal'
          : 'Professional navy, white, accent teal';

    const prompt = `Build a complete, production-ready website for the following business.

BUSINESS
- Name: ${name}
- Industry / Category: ${category}
- Location: ${location}
- Description: ${description || 'Premium local business with strong customer reputation.'}
${rating ? `- Google Rating: ${rating}★` : ''}
${reviews ? `- Review Count: ${reviews}+` : ''}
- Current website status: ${noWebsite ? 'No website exists' : 'Existing website needs major improvement'}

OBJECTIVE
Create a modern, high-converting ${solution.toLowerCase()} that:
- Builds immediate trust
- Clearly communicates services/products
- Makes it extremely easy to contact or convert
- Performs excellently on mobile
- Ranks for local search

RECOMMENDED PAGES
${pages.map((p) => `- ${p}`).join('\n')}

DESIGN DIRECTION
- Style: ${designDirection}
- Color palette suggestion: ${colorHint}
- Typography: Clean sans-serif headings + highly readable body (e.g. Inter / Plus Jakarta Sans / similar)
- Layout: Generous spacing, clear visual hierarchy, strong hero section
- Mobile-first responsive design is mandatory
- Subtle, professional animations only (no excessive motion)

UX & CONVERSION STRATEGY
- Primary CTA above the fold (Call / WhatsApp / Book / Shop)
- Sticky header with key action on mobile
- Trust bar: rating, review count, years in business, certifications if any
- Clear service/product cards with secondary CTAs
- Testimonials section using the strong review reputation
- Footer with NAP (Name, Address, Phone), hours, map embed, social links
- Click-to-call and click-to-WhatsApp buttons
${isBooking ? '- Integrated booking/reservation flow or clear calendar CTA\n' : ''}${isEcommerce ? '- Product catalog with filters, quick view, and seamless checkout\n' : ''}
- Contact form + direct phone + email + map

SEO & LOCAL SEO
- Proper title tags and meta descriptions for every page
- Schema.org LocalBusiness (and Product/Service where relevant)
- Optimized headings (single H1 per page)
- Fast loading images (WebP, proper sizing)
- Mobile performance (Core Web Vitals friendly)
- Google Business Profile alignment

TECHNICAL REQUIREMENTS
- Semantic HTML
- Accessible (WCAG 2.1 AA baseline)
- HTTPS ready
- Clean, maintainable code
- Easy to update content later

EXTRA FEATURES TO INCLUDE
- WhatsApp floating button (especially valuable for ${location || 'this market'})
- Optional AI chatbot stub for common questions
- Review/testimonial carousel
- Instagram feed or social proof section if relevant
- Blog or resources section (optional, for SEO)

OUTPUT
Generate a complete, beautiful, conversion-focused website that feels premium and matches the quality of the business’s real-world reputation. The site should make a visitor want to contact or buy within the first 10 seconds.`;

    return {
      prompt,
      recommendedPages: pages,
      designDirection,
    };
  },
};
