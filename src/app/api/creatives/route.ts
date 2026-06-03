import { NextRequest, NextResponse } from "next/server";
import { currentUser, resolveTenantId } from "@/lib/session";
import { getIntegration } from "@/lib/integrations";
import { JAIPUR_AREAS } from "@/lib/format";

export interface CreativesPayload {
  postType: "PROPERTY_AD" | "FESTIVE_GREETING" | "PRICE_DROP" | "OPEN_HOUSE";
  projectName: string;
  price: string;
  location: string;
  festival?: string;
  tone: "professional" | "casual" | "luxury" | "urgent";
}

export interface CreativesResponse {
  headline: string;
  body: string;
  hashtags: string[];
  cta: string;
  mode: "builtin" | "ai";
}

// High-quality templated mock copy per post type
function getMockCopy(payload: CreativesPayload): Omit<CreativesResponse, "mode"> {
  const { postType, projectName, price, location, festival, tone } = payload;
  const loc = location || JAIPUR_AREAS[0];
  const proj = projectName || "Shubh Residency";

  const toneMap = {
    professional: { prefix: "Introducing", urgency: "Schedule your consultation today." },
    casual: { prefix: "Exciting news!", urgency: "Come check it out this weekend! 😊" },
    luxury: { prefix: "An Extraordinary Opportunity", urgency: "Exclusive viewings by appointment only." },
    urgent: { prefix: "⚡ Limited Units Left!", urgency: "Call NOW — units selling fast!" },
  };
  const t = toneMap[tone] || toneMap.professional;

  if (postType === "PROPERTY_AD") {
    return {
      headline: `${t.prefix}: ${proj} in ${loc} — Starting ${price}`,
      body: `Your dream home is waiting in the heart of ${loc}. ${proj} offers world-class amenities, Vastu-compliant design, and easy connectivity to Jaipur's best schools, hospitals, and business hubs.\n\n✅ RERA Registered\n✅ Ready-to-Move Options\n✅ Flexible Payment Plans\n✅ Zero Brokerage`,
      hashtags: [
        `#${proj.replace(/\s/g, "")}`,
        `#${loc.replace(/\s/g, "")}`,
        "#JaipurRealEstate",
        "#DreamHome",
        "#RERAApproved",
        "#JaipurProperty",
        "#HomeBuyingJaipur",
      ],
      cta: t.urgency,
    };
  }

  if (postType === "FESTIVE_GREETING") {
    const fest = festival || "Diwali";
    return {
      headline: `Wishing You a Bright & Prosperous ${fest}! 🪔`,
      body: `On this auspicious occasion of ${fest}, ${proj} wishes you and your family abundant joy, health, and happiness. May this festival bring new beginnings — and perhaps a new home! 🏡\n\nCelebrate ${fest} with the gift of your dream home in ${loc}.`,
      hashtags: [
        `#${fest.replace(/\s/g, "")}`,
        `#Happy${fest.replace(/\s/g, "")}`,
        "#Jaipur",
        `#${proj.replace(/\s/g, "")}`,
        "#FestiveSeason",
        "#NewBeginnings",
      ],
      cta: `Book a site visit this ${fest} season and get exclusive festive offers!`,
    };
  }

  if (postType === "PRICE_DROP") {
    return {
      headline: `🎯 PRICE REVISED! ${proj} in ${loc} — Now at ${price}`,
      body: `Great news for home buyers! We've revised our pricing to make your dream more accessible.\n\n📍 Location: ${loc}\n💰 New Price: Starting ${price}\n🏗️ Project: ${proj}\n\nThis offer is for a limited period only. Don't miss this golden opportunity to own a premium home at an unbeatable price.`,
      hashtags: [
        "#PriceDrop",
        "#AffordableHomes",
        `#${loc.replace(/\s/g, "")}`,
        "#JaipurProperty",
        `#${proj.replace(/\s/g, "")}`,
        "#LimitedOffer",
        "#BuyNow",
      ],
      cta: "Book your unit today before prices go back up! Limited availability.",
    };
  }

  // OPEN_HOUSE
  return {
    headline: `🏡 Open House This Weekend — ${proj}, ${loc}`,
    body: `You're invited to experience ${proj} in person!\n\n📍 Location: ${loc}\n💰 Price: Starting ${price}\n🗓️ This Saturday & Sunday, 10 AM – 5 PM\n\nTour ready-to-move show flats, meet our team, and get exclusive on-site offers. Refreshments will be served. Bring your family!`,
    hashtags: [
      "#OpenHouse",
      `#${proj.replace(/\s/g, "")}`,
      `#${loc.replace(/\s/g, "")}`,
      "#JaipurHomes",
      "#SiteVisit",
      "#PropertyExpo",
    ],
    cta: "RSVP now — limited slots available for personalised tours!",
  };
}

export async function POST(req: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const tenantId = await resolveTenantId(user);
    if (!tenantId) return NextResponse.json({ error: "No tenant" }, { status: 400 });

    const body: CreativesPayload = await req.json();
    const { postType, projectName, price, location, festival, tone } = body;

    const apiKey = await getIntegration(tenantId, "ANTHROPIC");

    if (apiKey) {
      try {
        const typeLabel: Record<string, string> = {
          PROPERTY_AD: "Property Advertisement",
          FESTIVE_GREETING: `Festive Greeting (${festival || "festival"})`,
          PRICE_DROP: "Price Drop Announcement",
          OPEN_HOUSE: "Open House Invitation",
        };

        const prompt = `Generate ad copy for a real estate social media post.

Post Type: ${typeLabel[postType] || postType}
Project Name: ${projectName || "Shubh Residency"}
Price: ${price || "As per unit"}
Location: ${location || "Jaipur"}
${festival ? `Festival: ${festival}` : ""}
Tone: ${tone}
City: Jaipur, Rajasthan, India

Return a JSON object (no markdown, raw JSON only) with exactly these fields:
{
  "headline": "catchy headline under 12 words",
  "body": "2-3 paragraph ad copy with emojis where appropriate",
  "hashtags": ["array", "of", "8-10", "relevant", "hashtags", "without", "spaces"],
  "cta": "strong call to action sentence"
}`;

        const resp = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: "claude-sonnet-4-5",
            max_tokens: 1024,
            messages: [{ role: "user", content: prompt }],
          }),
        });

        if (resp.ok) {
          const data = await resp.json();
          const text: string = data?.content?.[0]?.text ?? "";
          // Strip markdown code fences if present
          const cleaned = text.replace(/```(?:json)?\n?/gi, "").trim();
          const parsed = JSON.parse(cleaned);
          return NextResponse.json({ ...parsed, mode: "ai" } as CreativesResponse);
        }
      } catch {
        // fall through to built-in copy
      }
    }

    // Return high-quality built-in copy
    const mock = getMockCopy(body);
    return NextResponse.json({ ...mock, mode: "builtin" } as CreativesResponse);
  } catch (e) {
    console.error("[Creatives route error]", e);
    // Always return something useful
    const fallback = getMockCopy({
      postType: "PROPERTY_AD",
      projectName: "Shubh Residency",
      price: "₹45L onwards",
      location: "Jaipur",
      tone: "professional",
    });
    return NextResponse.json({ ...fallback, mode: "builtin" }, { status: 200 });
  }
}
