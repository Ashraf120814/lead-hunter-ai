// =============================================================================
// Sales Agent — Personalized outreach generation
// Template-based, fact-grounded. Ready for LLM enhancement.
// =============================================================================

import type {
  SalesAgent,
  BusinessContext,
  EmailVariant,
  MessageVariant,
} from './types';
import type { CallScript } from '@/types';

function name(ctx: BusinessContext) {
  return (ctx.business as any).name || 'your business';
}
function category(ctx: BusinessContext) {
  return (ctx.business as any).category || 'business';
}
function city(ctx: BusinessContext) {
  return (ctx.business as any).city || 'your area';
}
function rating(ctx: BusinessContext) {
  const r = (ctx.business as any).googleRating;
  return r != null ? `${r}★` : null;
}
function reviews(ctx: BusinessContext) {
  return (ctx.business as any).reviewCount ?? 0;
}
function hasNoWebsite(ctx: BusinessContext) {
  const a = ctx.audit as any;
  return !a || a.status === 'no_website' || (!a.website_url && !a.url);
}
function qualityScore(ctx: BusinessContext) {
  return (ctx.audit as any)?.qualityScore ?? (ctx.audit as any)?.quality_score ?? null;
}

export const salesAgent: SalesAgent = {
  async generateEmails(ctx: BusinessContext): Promise<EmailVariant[]> {
    const n = name(ctx);
    const cat = category(ctx);
    const c = city(ctx);
    const r = rating(ctx);
    const rev = reviews(ctx);
    const noWeb = hasNoWebsite(ctx);
    const q = qualityScore(ctx);

    const positive = r
      ? `I noticed ${n} has an impressive ${r} rating${rev > 50 ? ` from ${rev}+ customers` : ''} in ${c}`
      : `I came across ${n} while looking at strong ${cat.toLowerCase()} businesses in ${c}`;

    const opportunity = noWeb
      ? `it currently doesn’t appear to have a professional website`
      : q != null && q < 45
        ? `the current website could be significantly improved (it scores quite low on modern standards)`
        : `there’s a clear opportunity to strengthen the online presence`;

    const value = noWeb
      ? `A clean, mobile-first website with clear calls-to-action and local SEO can help convert more of the people already discovering you through Google and social media.`
      : `A modern redesign focused on speed, mobile experience, and conversion can turn more visitors into customers and reduce reliance on paid ads.`;

    const professional: EmailVariant = {
      version: 'professional',
      subject: `A quick idea for improving ${n}'s online presence`,
      body: `Hi,

${positive}. 

What stood out is that ${opportunity}.

${value}

I’d be happy to share a short, no-obligation concept of what a stronger digital presence could look like for ${n}.

Would you be open to a brief conversation this week?

Best regards,
[Your Name]
[Your Agency]
[Phone] | [Email]`,
    };

    const friendly: EmailVariant = {
      version: 'friendly',
      subject: `Loved seeing ${n}'s reputation — quick thought`,
      body: `Hey,

${positive} — really solid.

I also noticed ${opportunity}. 

A lot of great local businesses are leaving growth on the table simply because their website doesn’t match the quality of the service they deliver.

I put together ideas like this for ${cat.toLowerCase()} businesses all the time. Happy to send over a couple of quick suggestions if you’re interested — no pressure at all.

Cheers,
[Your Name]`,
    };

    const highConversion: EmailVariant = {
      version: 'high_conversion',
      subject: `${n} — 1 idea that could bring more customers`,
      body: `Hi,

${positive}.

The gap I see: ${opportunity}.

Businesses with strong reviews but weak websites often convert far fewer searchers than they should. Fixing that usually pays for itself quickly.

I can show you a simple before/after concept for ${n} in under 15 minutes.

Open to a quick call this week?

[Your Name]
[Your Agency]`,
    };

    return [professional, friendly, highConversion];
  },

  async generateMessages(ctx: BusinessContext): Promise<MessageVariant[]> {
    const n = name(ctx);
    const noWeb = hasNoWebsite(ctx);
    const r = rating(ctx);

    const opening = r
      ? `Hi — saw ${n} has great reviews (${r}).`
      : `Hi — came across ${n}.`;

    const gap = noWeb
      ? `Noticed there’s no website yet.`
      : `Noticed the website could use a modern update.`;

    return [
      {
        channel: 'instagram_dm',
        body: `${opening} ${gap} I help local businesses turn their reputation into more customers with clean websites. Open to a quick idea?`,
      },
      {
        channel: 'whatsapp',
        body: `${opening} ${gap} Happy to share a short concept if useful — no obligation.`,
      },
      {
        channel: 'linkedin',
        body: `Hi, I noticed ${n} has strong local traction. ${gap} I specialize in conversion-focused websites for service businesses. Would a brief conversation be useful?`,
      },
      {
        channel: 'facebook_messenger',
        body: `Hi! ${opening} ${gap} I build modern sites for businesses like yours. Want me to send a quick example?`,
      },
      {
        channel: 'sms',
        body: `Hi, this is [Name]. Saw ${n} online — ${gap} Happy to share a quick idea if helpful.`,
      },
      {
        channel: 'contact_form',
        body: `Hello,\n\nI came across ${n} and was impressed by the reputation. ${gap}\n\nI help similar businesses improve their online presence with modern, conversion-focused websites. I’d be glad to share a short concept if you’re interested.\n\nBest regards,\n[Your Name]`,
      },
    ];
  },

  async generateCallScript(ctx: BusinessContext): Promise<CallScript> {
    const n = name(ctx);
    const cat = category(ctx);
    const c = city(ctx);
    const noWeb = hasNoWebsite(ctx);
    const r = rating(ctx);

    return {
      opening: `Hi, is this the owner or manager of ${n}?`,
      permission_question: `Do you have about 30 seconds? I had a quick observation about your online presence.`,
      personalized_observation: r
        ? `I noticed ${n} has strong reviews in ${c} — that’s excellent.`
        : `I’ve been looking at ${cat.toLowerCase()} businesses in ${c} and ${n} stood out.`,
      problem_opportunity: noWeb
        ? `What I also noticed is that there doesn’t appear to be a professional website yet. A lot of customers search online before they call or visit.`
        : `The current website looks like it could be holding the business back compared to the quality of the service you deliver.`,
      value_proposition: `I help businesses like yours turn existing reputation into more booked customers with a clean, mobile-first website and clear calls-to-action.`,
      discovery_questions: [
        `How do most new customers currently find you?`,
        `Are you happy with the number of inquiries coming from Google?`,
        `Have you looked at updating the website in the last couple of years?`,
      ],
      objection_handling: {
        'We already have a website.': `That’s good — many of the businesses I work with already have one. The question is whether it’s converting the traffic you’re already getting. Happy to show a quick comparison.`,
        "We don't need one.": `Understood. A lot of owners feel that way until they see how many people search and then leave because they can’t find clear information or a way to book. No pressure either way.`,
        "It's too expensive.": `Cost is always a consideration. Most clients find the project pays for itself within a few months through extra inquiries. I can also show staged options.`,
        'Send me an email.': `Absolutely. I’ll send a short overview and one relevant example. What’s the best email?`,
        'We already have someone.': `Great. If anything changes or you’d like a second opinion later, I’m happy to stay in touch.`,
        'Call me later.': `Of course. When would be a better time? I’ll call back then.`,
        'Not interested.': `No problem at all. Appreciate your time — wishing ${n} continued success.`,
      },
      offer: `I can put together a short, no-obligation concept of what a stronger website could look like for ${n}.`,
      cta: `Would you be open to a 10–15 minute call later this week so I can show you?`,
      follow_up: `If now isn’t a good time, I can send a one-page overview by email and we can decide from there.`,
    };
  },

  async generateFollowUps(ctx: BusinessContext, days = [1, 3, 7, 14]) {
    const n = name(ctx);
    return days.map((day) => ({
      day,
      subject:
        day === 1
          ? `Following up — idea for ${n}`
          : day === 3
            ? `Quick nudge on ${n}'s online presence`
            : day === 7
              ? `Still relevant for ${n}?`
              : `Last note regarding ${n}`,
      body:
        day <= 3
          ? `Hi,\n\nJust wanted to follow up on my previous note about ${n}'s online presence. Happy to share a short concept if useful.\n\nBest,\n[Your Name]`
          : `Hi,\n\nI’ll keep this brief. If improving the digital side of ${n} isn’t a priority right now, no worries at all. If it becomes relevant later, I’m easy to reach.\n\nBest regards,\n[Your Name]`,
    }));
  },
};
