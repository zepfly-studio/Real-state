import { NextResponse } from "next/server";
import { lgContext, isResponse } from "@/lib/leadgen/guard";
import { guarded, bad } from "@/lib/leadgen/respond";
import { asProposalArgs, perform, prepare, WRITE_TOOLS } from "@/lib/leadgen/assistant";

/**
 * POST /api/leadgen/assistant/execute  { tool, args } — perform an action the person confirmed.
 * The browser is never trusted to hand back exactly what was proposed: it is re-validated here.
 */
export async function POST(req: Request) {
  const ctx = await lgContext();
  if (isResponse(ctx)) return ctx;
  return guarded(async () => {
    const { tool, args } = await req.json().catch(() => ({}));
    if (!WRITE_TOOLS.has(String(tool))) return bad("That isn't an action the assistant can perform.", 400);
    const r = await prepare(ctx.tenantId, tool, asProposalArgs(tool, args && typeof args === "object" ? args : {}));
    if (!r.pending) return bad(r.problem || "Invalid action.");
    const message = await perform(ctx.tenantId, ctx.user.id, tool, r.pending.args);
    return NextResponse.json({ ok: true, message });
  });
}
