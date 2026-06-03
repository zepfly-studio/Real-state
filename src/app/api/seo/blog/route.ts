import { NextRequest, NextResponse } from "next/server";
import { currentUser, resolveTenantId } from "@/lib/session";
import { getIntegration } from "@/lib/integrations";

// ── In-house blog generator (~650 words, topic-aware) ────────────────────────

function buildBlog(topic: string, keywords: string): { title: string; markdown: string; mode: "builtin" } {
  const kw = keywords || topic;
  const topicLower = topic.toLowerCase();

  // Detect micro-market focus
  const areaMap: Record<string, { price2: string; price3: string; highlight: string }> = {
    jagatpura: { price2: "₹52–68L", price3: "₹65–90L", highlight: "airport metro link and IT corridor proximity" },
    mansarovar: { price2: "₹55–75L", price3: "₹70–95L", highlight: "fully developed neighbourhood with top schools and hospitals" },
    "vaishali nagar": { price2: "₹60–85L", price3: "₹80–1.1Cr", highlight: "premium social infrastructure and high resale liquidity" },
    "tonk road": { price2: "₹48–65L", price3: "₹62–88L", highlight: "RIICO industrial belt and fast-rising commercial demand" },
    "ajmer road": { price2: "₹38–54L", price3: "₹50–72L", highlight: "affordable townships with Ring Road connectivity" },
    "c-scheme": { price2: "₹80–1.2Cr", price3: "₹1.1–1.8Cr", highlight: "Jaipur's most prestigious address for luxury buyers" },
    sitapura: { price2: "₹40–58L", price3: "₹55–78L", highlight: "Rajasthan's fastest-growing IT and industrial hub" },
  };

  const matchedArea = Object.keys(areaMap).find((a) => topicLower.includes(a));
  const areaInfo = matchedArea ? areaMap[matchedArea] : areaMap["jagatpura"];
  const areaName = matchedArea
    ? matchedArea.replace(/\b\w/g, (c) => c.toUpperCase())
    : "Jagatpura";

  // Property type detection
  const propType = topicLower.includes("villa")
    ? "Villa"
    : topicLower.includes("plot")
    ? "Plot"
    : topicLower.includes("commercial")
    ? "Commercial Space"
    : topicLower.includes("2bhk") || topicLower.includes("2 bhk")
    ? "2 BHK Apartment"
    : "3 BHK Apartment";

  const investorFocus = topicLower.includes("invest") || topicLower.includes("return") || topicLower.includes("yield");

  const markdown = `# ${topic}

## Introduction

${
  investorFocus
    ? `Looking for a high-yield real estate investment in Jaipur? Smart investors across India are turning to the Pink City for its blend of heritage charm, booming infrastructure, and attractive rental yields. In this guide, we dive deep into ${topicLower} — covering micro-markets, pricing, ROI benchmarks, and what to watch out for.`
    : `Planning to buy a home in Jaipur? You're making one of the best decisions of your life. The Pink City has emerged as North India's most balanced real estate market — combining strong price appreciation with liveable neighbourhoods and excellent social infrastructure. This guide covers everything you need to know about ${topicLower}.`
}

## Why ${areaName} Stands Out in Jaipur's Property Market

${areaName} has consistently ranked among Jaipur's top-performing micro-markets, thanks to its **${areaInfo.highlight}**. Demand here has grown 15–20% year-on-year, driven by:

- **Expanding metro connectivity** putting the area within 25 minutes of Jaipur Junction
- **New RERA-registered projects** offering transparent, buyer-friendly terms
- **Strong rental demand** from IT professionals and young families relocating from Tier-1 cities
- **Appreciation potential** outpacing the Jaipur average, especially in premium segments

${
  propType === "2 BHK Apartment"
    ? `Current 2 BHK prices in ${areaName} range from **${areaInfo.price2}**, making it accessible for first-time buyers and young professionals alike.`
    : propType === "3 BHK Apartment"
    ? `3 BHK apartments in ${areaName} are currently priced between **${areaInfo.price3}**, with ready-to-move options available at a slight premium.`
    : `Properties in ${areaName} span a wide range — from affordable configurations to premium luxury units — catering to every buyer profile.`
}

## Key Factors Driving Jaipur Real Estate in 2024–25

Jaipur's macro tailwinds remain strong:

- **Delhi-Mumbai Industrial Corridor (DMIC)**: Neemrana–Jaipur stretch is generating thousands of jobs annually, boosting housing demand.
- **Smart City Mission**: ₹2,400 crore invested in road widening, drainage, and public spaces has elevated liveability scores.
- **IT & Startup Growth**: Sitapura's IT park and upcoming tech SEZ are attracting a new generation of homebuyers.
- **Rajasthan RERA Enforcement**: Stricter compliance has weeded out unreliable builders, strengthening buyer confidence.

## What to Check Before You Buy

1. **RERA Registration**: Always verify the project number on the Rajasthan RERA portal (rera.rajasthan.gov.in). No RERA = no deal.
2. **Builder Track Record**: Ask for previous project delivery dates vs. actuals. Delays of 12–24 months are common with underfunded developers.
3. **Loan Pre-approval**: Ensure at least 2 major banks have pre-approved the project — this is a quality signal.
4. **Construction Stage**: Visit the site. A project at 60%+ construction is far safer than a ground-floor booking.
5. **Society Maintenance**: Clarify monthly maintenance charges (typically ₹2–5/sqft) and what they include.

## Price Benchmarks — ${areaName} & Nearby Areas (2024)

| Locality | Property Type | Price Range |
|---|---|---|
| ${areaName} | 2 BHK | ${areaInfo.price2} |
| ${areaName} | 3 BHK | ${areaInfo.price3} |
| Mansarovar | 2 BHK | ₹55–75L |
| Vaishali Nagar | 2/3 BHK | ₹65–1.1Cr |
| Ajmer Road | Affordable 2 BHK | ₹38–54L |

## ${investorFocus ? "ROI & Rental Yield Overview" : "Is This the Right Time to Buy?"}

${
  investorFocus
    ? `Rental yields in Jaipur's growth corridors currently average **3.5–5.5% gross** annually — better than fixed deposits and with capital appreciation on top. Investors targeting ${areaName} have seen **12–18% price appreciation** over 24 months. Short-term rental (Airbnb-style) near heritage zones can push yields to **8–12%** for well-located units.`
    : `Yes — and here's why. Jaipur property prices have appreciated ~15% over the last two years, and with the metro expansion, infrastructure investment, and job creation continuing, the fundamentals remain strong. Waiting another year is likely to mean paying 8–12% more for the same unit.`
}

## Final Thoughts — Partner with the Right Developer

Navigating Jaipur's property market is easier when you work with a trusted, RERA-registered developer who has a proven track record.

At **Shubh Realtors**, we curate only RERA-approved projects across Jaipur's fastest-growing localities. Our end-to-end service covers property shortlisting, home loan coordination, legal due diligence, and possession handover.

**Book a free site visit today** — call us at +91-98765-43210 or fill our contact form. Zero brokerage, full transparency.

---
*SEO keywords covered: ${kw}*`;

  return { title: topic, markdown, mode: "builtin" };
}

export async function POST(req: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const tenantId = await resolveTenantId(user);
    if (!tenantId) return NextResponse.json({ error: "No tenant" }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const topic: string = (body.topic ?? "Real Estate Investment in Jaipur").trim();
    const keywords: string = (body.keywords ?? "").trim();

    if (!topic) {
      return NextResponse.json(buildBlog("Real Estate Investment in Jaipur", keywords));
    }

    const apiKey = await getIntegration(tenantId, "ANTHROPIC");

    if (apiKey) {
      try {
        const systemPrompt = `You are an expert SEO content writer specialising in Indian real estate, specifically Jaipur. Write engaging, informative, SEO-optimised blog posts in English. Use markdown formatting with proper H2 headings (##). Include:
- A compelling introduction
- 4-5 H2 sections covering key aspects
- Specific Jaipur localities: Mansarovar, Jagatpura, Vaishali Nagar, Tonk Road, Ajmer Road, C-Scheme, Sitapura
- Realistic price ranges in INR (lakhs/crore)
- Practical buyer tips
- A clear call-to-action for Shubh Realtors
- Target word count: ~600 words
Always mention RERA compliance. Use ₹ for currency.`;

        const userPrompt = `Write a detailed SEO blog post about: "${topic}"
Target keywords to naturally include: ${keywords || topic}
Return ONLY the markdown content, starting with the H1 title (#).`;

        const resp = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: "claude-sonnet-4-5",
            max_tokens: 1800,
            system: systemPrompt,
            messages: [{ role: "user", content: userPrompt }],
          }),
        });

        if (resp.ok) {
          const data = await resp.json();
          const markdown = data?.content?.[0]?.text ?? "";
          if (markdown) {
            const titleMatch = markdown.match(/^#\s+(.+)/m);
            const title = titleMatch ? titleMatch[1] : topic;
            return NextResponse.json({ title, markdown, mode: "ai" });
          }
        }
      } catch {
        // fall through to built-in generator
      }
    }

    return NextResponse.json(buildBlog(topic, keywords));
  } catch (e) {
    console.error("[seo/blog route error]", e);
    // Never throw — always return something useful
    return NextResponse.json(
      buildBlog("Real Estate Investment in Jaipur", ""),
      { status: 200 }
    );
  }
}
