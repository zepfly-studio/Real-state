import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { parseBrief, type Brief } from "./intent";
import { fireN8n } from "./n8n";
import { logEvent } from "./db";

/** Create a campaign from a spoken/typed brief and start the n8n workflow. Shared by the Launch box and the assistant. */
export async function launchCampaign(tenantId: string, userId: string, transcriptRaw: string, approved?: Brief) {
  const transcript = transcriptRaw.trim().slice(0, 600);
  // `approved` = what the person confirmed on screen after reviewing the AI's reading of the brief.
  const brief = approved ?? (await parseBrief(tenantId, transcript));
  const name = brief.location
    ? `${brief.location} Campaign`
    : `Campaign ${new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`;

  const campaign = await prisma.lgCampaign.create({
    data: { tenantId, name, targetLocation: brief.location || null, leadTarget: brief.leadCount, status: "SCRAPING", transcript },
  });
  await logEvent(tenantId, "campaign_launched", `${name} — ${brief.location || "no location"} / ${brief.leadCount} leads`, { campaignId: campaign.id });
  await audit({ tenantId, action: "LEADGEN_CAMPAIGN_LAUNCHED", entity: "LgCampaign", entityId: campaign.id, performedById: userId, meta: { ...brief } });

  const n8n = await fireN8n(tenantId, { campaign_id: campaign.id, transcript, location: brief.location, lead_count: brief.leadCount });
  await logEvent(tenantId, n8n.ok ? "n8n_dispatch" : "n8n_dispatch_failed", n8n.detail, { campaignId: campaign.id });
  if (!n8n.ok) await prisma.lgCampaign.update({ where: { id: campaign.id }, data: { status: "PENDING" } });

  return {
    campaignId: campaign.id,
    name,
    parsed: { location: brief.location, leadCount: brief.leadCount },
    automation: (n8n.ok ? "started" : n8n.configured ? "unreachable" : "not_connected") as "started" | "unreachable" | "not_connected",
    message: n8n.ok
      ? `Campaign launched — finding ${brief.leadCount || "new"} sellers${brief.location ? ` in ${brief.location}` : ""}.`
      : `Campaign saved, but ${n8n.detail}`,
  };
}
