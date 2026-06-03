import { NextRequest, NextResponse } from "next/server";
import { currentUser, resolveTenantId } from "@/lib/session";
import { fetchNews } from "@/lib/news";

export async function GET(req: NextRequest) {
  try {
    const user = await currentUser();
    const tenantId = user ? await resolveTenantId(user) : null;

    const payload = await fetchNews(tenantId);
    return NextResponse.json(payload, {
      headers: { "Cache-Control": "s-maxage=3600, stale-while-revalidate=60" },
    });
  } catch (err: any) {
    // Never throw — return empty demo payload
    return NextResponse.json({ items: [], isDemo: true });
  }
}
