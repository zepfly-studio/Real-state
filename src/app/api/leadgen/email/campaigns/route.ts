import { NextResponse } from "next/server";
import { lgContext, isResponse } from "@/lib/leadgen/guard";
import { guarded, bad } from "@/lib/leadgen/respond";
import { campaignsWithStats, clearCache, sl, SmartleadError, toInt, totals } from "@/lib/leadgen/smartlead";

/** GET /api/leadgen/email/campaigns — every Smartlead campaign with its stats and combined totals. */
export async function GET(req: Request) {
  const ctx = await lgContext();
  if (isResponse(ctx)) return ctx;
  return guarded(async () => {
    const refresh = new URL(req.url).searchParams.get("refresh") === "1";
    const items = await campaignsWithStats(ctx.tenantId, refresh);
    items.sort((a, b) => Number(a.status !== "ACTIVE") - Number(b.status !== "ACTIVE") || b.id - a.id);
    return { campaigns: items, totals: totals(items) };
  });
}

/** POST { name } — create a draft campaign in Smartlead. */
export async function POST(req: Request) {
  const ctx = await lgContext();
  if (isResponse(ctx)) return ctx;
  return guarded(async () => {
    const { name } = await req.json().catch(() => ({}));
    const clean = String(name ?? "").trim();
    if (clean.length < 2 || clean.length > 120) return bad("Give the campaign a name (2–120 characters).");
    let data: any;
    try {
      data = await sl(ctx.tenantId, "POST", "/campaigns/create", { json: { name: clean } });
    } catch (e) {
      if (!(e instanceof SmartleadError) || ![404, 405].includes(e.status)) throw e;
      data = await sl(ctx.tenantId, "POST", "/campaigns/new", { json: { name: clean } }); // older docs name this path differently
    }
    clearCache(ctx.tenantId);
    return NextResponse.json({ id: toInt(data?.id ?? data?.campaign?.id), name: clean });
  });
}
