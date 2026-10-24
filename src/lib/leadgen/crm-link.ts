import { LeadSource, LeadTemperature, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { logEvent } from "./db";
import { phoneKey } from "./stages";

/**
 * Copy a lead-generation prospect into the CRM (Sales & Support CRM).
 * This only ever INSERTS one CRM Lead — or links to the one that already exists for that phone.
 * It never edits or deletes an existing CRM record.
 */
export async function copyToCrm(
  tenantId: string,
  userId: string,
  lgLeadId: string
): Promise<{ ok: true; crmLeadId: string; created: boolean } | { ok: false; status: number; error: string }> {
  const lg = await prisma.lgLead.findFirst({ where: { id: lgLeadId, tenantId } });
  if (!lg) return { ok: false, status: 404, error: "Lead not found." };

  if (lg.crmLeadId) {
    const linked = await prisma.lead.findFirst({ where: { id: lg.crmLeadId, tenantId }, select: { id: true } });
    if (linked) return { ok: true, crmLeadId: linked.id, created: false };
  }

  // Already in the CRM under the same phone number? Link instead of duplicating.
  const key = phoneKey(lg.phone);
  const candidates = key.length >= 7 ? await prisma.lead.findMany({ where: { tenantId, phone: { contains: key } }, take: 5 }) : [];
  const existing = candidates.find((c) => phoneKey(c.phone) === key);

  const campaign = lg.campaignId ? await prisma.lgCampaign.findFirst({ where: { id: lg.campaignId, tenantId } }) : null;
  const chats = await prisma.lgMessage.count({ where: { tenantId, leadId: lg.id } });

  let crmId = existing?.id;
  if (!crmId) {
    const notes = [
      "Added from Lead Generation" + (campaign ? ` — campaign “${campaign.name}”` : "") + ".",
      [lg.title, lg.company].filter(Boolean).length ? `${[lg.title, lg.company].filter(Boolean).join(" at ")}.` : "",
      lg.linkedin ? `LinkedIn: ${lg.linkedin}` : "",
      lg.timeline ? `Timeline to sell: ${lg.timeline}.` : "",
      chats ? `${chats} WhatsApp message${chats === 1 ? "" : "s"} exchanged.` : "",
    ]
      .filter(Boolean)
      .join(" ");
    const created = await prisma.lead.create({
      data: {
        tenantId,
        name: (lg.name || lg.phone || lg.email || "Unknown").slice(0, 200),
        phone: lg.phone ?? "",
        email: lg.email,
        propertyType: "Not specified",
        location: (lg.address || lg.city || campaign?.targetLocation || "Not specified").slice(0, 300),
        source: LeadSource.WHATSAPP,
        temperature: lg.status === "HOT_LEAD" ? LeadTemperature.HOT : LeadTemperature.WARM,
        value: new Prisma.Decimal(lg.askingPrice ? String(lg.askingPrice) : "0"),
        notes,
      },
    });
    crmId = created.id;
  }

  await prisma.lgLead.update({ where: { id: lg.id }, data: { crmLeadId: crmId } });
  await logEvent(tenantId, "status_change", `${lg.name || lg.phone} ${existing ? "linked to" : "added to"} the CRM`, { campaignId: lg.campaignId, leadId: lg.id });
  await audit({ tenantId, action: "LEADGEN_LEAD_TO_CRM", entity: "Lead", entityId: crmId, performedById: userId, meta: { lgLeadId: lg.id, linkedExisting: Boolean(existing) } });
  return { ok: true, crmLeadId: crmId, created: !existing };
}
