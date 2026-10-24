import { NextResponse } from "next/server";
import { lgContext, isResponse } from "@/lib/leadgen/guard";
import { guarded } from "@/lib/leadgen/respond";
import { copyToCrm } from "@/lib/leadgen/crm-link";

/** POST /api/leadgen/leads/:id/crm — copy a lead-generation prospect into the Sales & Support CRM. */
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const ctx = await lgContext();
  if (isResponse(ctx)) return ctx;
  return guarded(async () => {
    const r = await copyToCrm(ctx.tenantId, ctx.user.id, params.id);
    return r.ok ? NextResponse.json(r) : NextResponse.json({ error: r.error }, { status: r.status });
  });
}
