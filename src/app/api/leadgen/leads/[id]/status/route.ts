import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { lgContext, isResponse } from "@/lib/leadgen/guard";
import { guarded, bad } from "@/lib/leadgen/respond";
import { logEvent } from "@/lib/leadgen/db";

const ALLOWED = ["HOT_LEAD", "UNQUALIFIED", "WHATSAPP_SENT"];

/** PATCH /api/leadgen/leads/:id/status  { status } — mark a lead Interested / Not interested by hand. */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const ctx = await lgContext();
  if (isResponse(ctx)) return ctx;
  return guarded(async () => {
    const { status } = await req.json().catch(() => ({}));
    if (!ALLOWED.includes(status)) return bad("Status must be Interested, Not interested or Messaged.");
    const lead = await prisma.lgLead.findFirst({ where: { id: params.id, tenantId: ctx.tenantId } });
    if (!lead) return bad("Lead not found.", 404);
    await prisma.lgLead.update({ where: { id: lead.id }, data: { status } });
    await logEvent(ctx.tenantId, "status_change", `${lead.name || lead.phone} marked ${status} from the dashboard`, { campaignId: lead.campaignId, leadId: lead.id });
    return NextResponse.json({ ok: true, status });
  });
}
