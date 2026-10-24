import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { buildPlan, normalizePlan, type SearchPlan } from "./plan";
import { fireN8n } from "./n8n";
import { toActorInput } from "./apify";
import { logEvent } from "./db";

export function campaignName(plan: SearchPlan): string {
  const where = plan.location.split(",")[0]?.trim();
  return where ? `${plan.target} — ${where}` : plan.target || `Campaign ${new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`;
}

/**
 * Create a campaign from an approved search plan (or a brief, planned on the spot) and start n8n.
 * Shared by the Launch box and the assistant.
 */
export async function launchCampaign(tenantId: string, userId: string, transcriptRaw: string, approved?: SearchPlan) {
  const transcript = transcriptRaw.trim().slice(0, 600);
  const plan = approved ? normalizePlan(approved) : (await buildPlan(tenantId, transcript)).plan;
  const name = campaignName(plan);

  const campaign = await prisma.lgCampaign.create({
    data: { tenantId, name, targetLocation: plan.location || null, leadTarget: plan.lead_count, status: "SCRAPING", transcript, plan: plan as any },
  });
  await logEvent(tenantId, "campaign_launched", `${name} / ${plan.lead_count} leads — ${plan.keywords.slice(0, 4).join(", ")}`, { campaignId: campaign.id });
  await audit({ tenantId, action: "LEADGEN_CAMPAIGN_LAUNCHED", entity: "LgCampaign", entityId: campaign.id, performedById: userId, meta: { ...plan } });

  // apify_input = the plan already converted to the scraper's input format; n8n forwards it as-is.
  const n8n = await fireN8n(tenantId, { campaign_id: campaign.id, transcript, location: plan.location, lead_count: plan.lead_count, plan, apify_input: toActorInput(plan) });
  await logEvent(tenantId, n8n.ok ? "n8n_dispatch" : "n8n_dispatch_failed", n8n.detail, { campaignId: campaign.id });
  if (!n8n.ok) await prisma.lgCampaign.update({ where: { id: campaign.id }, data: { status: "PENDING" } });

  return {
    campaignId: campaign.id,
    name,
    plan,
    parsed: { location: plan.location, leadCount: plan.lead_count },
    automation: (n8n.ok ? "started" : n8n.configured ? "unreachable" : "not_connected") as "started" | "unreachable" | "not_connected",
    message: n8n.ok
      ? `Campaign launched — finding ${plan.lead_count || "new"} ${plan.target.toLowerCase()}${plan.location ? ` in ${plan.location.split(",")[0]}` : ""}.`
      : `Campaign saved, but ${n8n.detail}`,
  };
}
