import { NextResponse } from "next/server";
import { lgContext, isResponse } from "@/lib/leadgen/guard";
import { guarded, bad } from "@/lib/leadgen/respond";
import { launchCampaign } from "@/lib/leadgen/launch";

/**
 * POST /api/leadgen/launch   { transcript }
 * Reads the spoken/typed brief (Gemini, else a simple reader), creates the campaign,
 * and starts the n8n workflow. Returns immediately.
 */
export async function POST(req: Request) {
  const ctx = await lgContext();
  if (isResponse(ctx)) return ctx;
  return guarded(async () => {
    const body = await req.json().catch(() => ({}));
    const transcript = String(body.transcript ?? "").trim();
    if (transcript.length < 5) return bad("Describe the area and how many sellers you want, e.g. “find 50 sellers in Mansarovar”.");
    return NextResponse.json(await launchCampaign(ctx.tenantId, ctx.user.id, transcript));
  });
}
