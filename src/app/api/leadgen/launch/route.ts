import { NextResponse } from "next/server";
import { lgContext, isResponse } from "@/lib/leadgen/guard";
import { guarded, bad } from "@/lib/leadgen/respond";
import { launchCampaign } from "@/lib/leadgen/launch";

/**
 * POST /api/leadgen/launch   { transcript }
 * Reads the spoken/typed brief (ChatGPT, else a simple reader), creates the campaign,
 * and starts the n8n workflow. Returns immediately.
 */
export async function POST(req: Request) {
  const ctx = await lgContext();
  if (isResponse(ctx)) return ctx;
  return guarded(async () => {
    const body = await req.json().catch(() => ({}));
    const transcript = String(body.transcript ?? "").trim();
    if (transcript.length < 5) return bad("Describe the area and how many sellers you want, e.g. “find 50 sellers in Mansarovar”.");
    // Values the person reviewed and approved on screen win over a fresh AI reading.
    const approved =
      body.location !== undefined || body.lead_count !== undefined
        ? { location: String(body.location ?? "").trim().slice(0, 120), leadCount: Math.max(0, Math.min(5000, Math.round(Number(body.lead_count) || 0))) }
        : undefined;
    return NextResponse.json(await launchCampaign(ctx.tenantId, ctx.user.id, transcript, approved));
  });
}
