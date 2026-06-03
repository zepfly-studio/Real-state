import { requireUser, resolveTenantId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getIntegration } from "@/lib/integrations";
import { CampaignChannel } from "@prisma/client";
import { WhatsAppClient } from "./client";

export default async function WhatsAppPage() {
  const user = await requireUser();
  const tenantId = await resolveTenantId(user);

  if (!tenantId) {
    return <div className="text-txt-dim p-8">No tenant context.</div>;
  }

  const [campaigns, leads, whatsappKey] = await Promise.all([
    prisma.campaign.findMany({
      where: { tenantId, channel: CampaignChannel.WHATSAPP },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.lead.findMany({
      where: { tenantId },
      select: {
        id: true,
        name: true,
        phone: true,
        temperature: true,
        stage: true,
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    getIntegration(tenantId, "WHATSAPP"),
  ]);

  const serialisedCampaigns = campaigns.map((c) => ({
    ...c,
    analytics: c.analytics as Record<string, number>,
    scheduledAt: c.scheduledAt ? c.scheduledAt.toISOString() : null,
    createdAt: c.createdAt.toISOString(),
  }));

  return (
    <WhatsAppClient
      campaigns={serialisedCampaigns}
      leads={leads}
      hasKey={!!whatsappKey}
      tenantId={tenantId}
    />
  );
}
