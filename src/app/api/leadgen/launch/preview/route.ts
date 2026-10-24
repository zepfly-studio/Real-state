import { NextResponse } from "next/server";
import { lgContext, isResponse } from "@/lib/leadgen/guard";
import { guarded, bad } from "@/lib/leadgen/respond";
import { buildPlan } from "@/lib/leadgen/plan";
import { campaignName } from "@/lib/leadgen/launch";

/**
 * POST /api/leadgen/launch/preview  { transcript }
 * Step 1 of a launch: the AI turns the brief into a search plan (keywords, decision-maker titles,
 * exclusions, seniority, location, count). Nothing is created — the person reviews, edits, then launches.
 */
export async function POST(req: Request) {
  const ctx = await lgContext();
  if (isResponse(ctx)) return ctx;
  return guarded(async () => {
    const body = await req.json().catch(() => ({}));
    const transcript = String(body.transcript ?? "").trim().slice(0, 600);
    if (transcript.length < 5) return bad("Say who you want and where, e.g. “50 dentists in Noida”.");
    const { plan, readBy } = await buildPlan(ctx.tenantId, transcript);
    return NextResponse.json({ plan, name: campaignName(plan), readBy });
  });
}
