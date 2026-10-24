import { prisma } from "@/lib/prisma";
import { phoneKey } from "./stages";

/** Append one line to the lead-generation activity feed. Never throws. */
export async function logEvent(
  tenantId: string,
  type: string,
  detail: string,
  ids: { campaignId?: string | null; leadId?: string | null } = {}
) {
  try {
    await prisma.lgEvent.create({
      data: { tenantId, type, detail: detail.slice(0, 500), campaignId: ids.campaignId ?? null, leadId: ids.leadId ?? null },
    });
  } catch {
    /* the feed must never break a request */
  }
}

/** Find a lead by id, else by phone (last 10 digits), always inside the tenant. */
export async function findLead(tenantId: string, opts: { id?: string | null; phone?: string | null }) {
  if (opts.id) {
    const byId = await prisma.lgLead.findFirst({ where: { id: opts.id, tenantId } });
    if (byId) return byId;
  }
  const key = phoneKey(opts.phone);
  if (key.length < 7) return null;
  const rows = await prisma.lgLead.findMany({
    where: { tenantId, phone: { contains: key } },
    orderBy: { createdAt: "desc" },
    take: 5,
  });
  return rows.find((r) => phoneKey(r.phone) === key) ?? null;
}

/** Record a chat message and its feed line. */
export async function logMessage(
  tenantId: string,
  phone: string,
  direction: "INBOUND" | "OUTBOUND",
  text: string,
  lead?: { id: string; campaignId: string | null } | null
) {
  await prisma.lgMessage.create({
    data: { tenantId, leadId: lead?.id ?? null, phone, direction, text },
  });
  await logEvent(tenantId, "whatsapp_message", `${direction} ${phone}: ${text.slice(0, 80)}`, {
    campaignId: lead?.campaignId,
    leadId: lead?.id,
  });
}
