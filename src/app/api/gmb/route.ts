import { NextResponse } from "next/server";
import { currentUser, resolveTenantId } from "@/lib/session";
import { getIntegration } from "@/lib/integrations";

const MOCK_PROFILE = {
  name: "Shubh Realtors",
  category: "Real Estate Agency",
  rating: 4.6,
  totalReviews: 10,
  verified: true,
  address: "Jagatpura, Jaipur, Rajasthan 302017",
  phone: "+91-98765-43210",
  website: "shubhrealtors.com",
  hours: "Mon–Sat 9AM–7PM",
};

const MOCK_METRICS = {
  profileViews: 2340,
  searchImpressions: 8400,
  callsThisMonth: 85,
  directionsThisMonth: 118,
  websiteClicksThisMonth: 378,
};

export async function GET() {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const tenantId = await resolveTenantId(user);
    if (!tenantId) return NextResponse.json({ error: "No tenant" }, { status: 400 });

    const [gmbKey, gmapsKey] = await Promise.all([
      getIntegration(tenantId, "GMB"),
      getIntegration(tenantId, "GMAPS"),
    ]);

    const isLive = !!(gmbKey || gmapsKey);

    if (isLive) {
      // In a real implementation, you would call the Google Business Profile API here.
      // For now, return enriched mock with live flag.
      return NextResponse.json({
        demo: false,
        profile: MOCK_PROFILE,
        metrics: MOCK_METRICS,
      });
    }

    return NextResponse.json({
      demo: true,
      profile: MOCK_PROFILE,
      metrics: MOCK_METRICS,
    });
  } catch (e) {
    console.error("[gmb route error]", e);
    return NextResponse.json(
      { demo: true, profile: MOCK_PROFILE, metrics: MOCK_METRICS },
      { status: 200 }
    );
  }
}
