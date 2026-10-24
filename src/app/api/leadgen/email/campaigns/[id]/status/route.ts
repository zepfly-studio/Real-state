import { NextResponse } from "next/server";
import { lgContext, isResponse } from "@/lib/leadgen/guard";
import { guarded, bad } from "@/lib/leadgen/respond";
import { clearCache, sl } from "@/lib/leadgen/smartlead";

const MAP: Record<string, string> = { start: "START", pause: "PAUSED", stop: "STOPPED" };

/** POST { action: "start" | "pause" | "stop" } */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const ctx = await lgContext();
  if (isResponse(ctx)) return ctx;
  return guarded(async () => {
    const { action } = await req.json().catch(() => ({}));
    const status = MAP[String(action)];
    if (!status) return bad("Action must be start, pause or stop.");
    const id = Number(params.id);
    if (!Number.isInteger(id) || id <= 0) return bad("Bad campaign id.");
    await sl(ctx.tenantId, "POST", `/campaigns/${id}/status`, { json: { status } });
    clearCache(ctx.tenantId);
    return NextResponse.json({ ok: true, action });
  });
}
