import { NextResponse } from "next/server";
import { assistantContext, isResponse } from "@/lib/leadgen/guard";
import { guarded, bad } from "@/lib/leadgen/respond";
import { accessFor, asProposalArgs, perform, prepare, WRITE_TOOLS } from "@/lib/leadgen/assistant";

/**
 * POST /api/assistant/execute  { tool, args } — perform an action the person confirmed.
 * Never trust the browser to hand back exactly what was proposed: permissions and data are re-validated here.
 */
export async function POST(req: Request) {
  const ctx = await assistantContext();
  if (isResponse(ctx)) return ctx;
  return guarded(async () => {
    const { tool, args } = await req.json().catch(() => ({}));
    if (!WRITE_TOOLS.has(String(tool))) return bad("That isn't an action the assistant can perform.", 400);
    const access = await accessFor(ctx.user.role, ctx.tenantId);
    const r = await prepare(ctx.tenantId, access, tool, asProposalArgs(tool, args && typeof args === "object" ? args : {}));
    if (!r.pending) return bad(r.problem || "Invalid action.");
    const message = await perform(ctx.tenantId, ctx.user.id, tool, r.pending.args);
    return NextResponse.json({ ok: true, message });
  });
}
