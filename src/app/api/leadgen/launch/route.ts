import { NextResponse } from "next/server";
import { lgContext, isResponse } from "@/lib/leadgen/guard";
import { guarded, bad } from "@/lib/leadgen/respond";
import { launchCampaign } from "@/lib/leadgen/launch";
import { normalizePlan } from "@/lib/leadgen/plan";

/**
 * POST /api/leadgen/launch   { transcript, plan? }
 * `plan` is the search plan the person reviewed and approved (from /launch/preview).
 * Without it the brief is planned on the spot. Creates the campaign and starts n8n; returns immediately.
 */
export async function POST(req: Request) {
  const ctx = await lgContext();
  if (isResponse(ctx)) return ctx;
  return guarded(async () => {
    const body = await req.json().catch(() => ({}));
    const transcript = String(body.transcript ?? "").trim();
    if (transcript.length < 5) return bad("Say who you want and where, e.g. “50 dentists in Noida”.");
    const approved = body.plan && typeof body.plan === "object" ? normalizePlan(body.plan) : undefined;
    if (approved && (!approved.location || approved.lead_count < 1 || !approved.keywords.length)) {
      return bad("The plan needs a location, how many leads, and at least one keyword.");
    }
    return NextResponse.json(await launchCampaign(ctx.tenantId, ctx.user.id, transcript, approved));
  });
}
