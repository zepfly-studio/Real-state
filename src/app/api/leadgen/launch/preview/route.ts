import { NextResponse } from "next/server";
import { getIntegration } from "@/lib/integrations";
import { lgContext, isResponse } from "@/lib/leadgen/guard";
import { guarded, bad } from "@/lib/leadgen/respond";
import { parseBrief } from "@/lib/leadgen/intent";

/**
 * POST /api/leadgen/launch/preview  { transcript }
 * Step 1 of a launch: the AI reads the spoken/typed brief and says what it understood.
 * Nothing is created here — the person reviews, edits if needed, then confirms with /launch.
 */
export async function POST(req: Request) {
  const ctx = await lgContext();
  if (isResponse(ctx)) return ctx;
  return guarded(async () => {
    const body = await req.json().catch(() => ({}));
    const transcript = String(body.transcript ?? "").trim().slice(0, 600);
    if (transcript.length < 5) return bad("Describe the area and how many sellers you want, e.g. “find 50 sellers in Mansarovar”.");
    const [brief, ai] = await Promise.all([parseBrief(ctx.tenantId, transcript), getIntegration(ctx.tenantId, "OPENAI")]);
    return NextResponse.json({
      location: brief.location,
      leadCount: brief.leadCount,
      name: brief.location ? `${brief.location} Campaign` : "New campaign",
      readBy: ai ? "ChatGPT" : "basic reader",
    });
  });
}
