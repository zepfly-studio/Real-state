import { requireUser, resolveTenantId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getIntegration } from "@/lib/integrations";
import { CampaignChannel } from "@prisma/client";
import { SocialClient } from "./client";

const SOCIAL_CHANNELS: CampaignChannel[] = [
  CampaignChannel.INSTAGRAM,
  CampaignChannel.FACEBOOK,
  CampaignChannel.LINKEDIN,
  CampaignChannel.TWITTER,
];

export default async function SocialPage() {
  const user = await requireUser();
  const tenantId = await resolveTenantId(user);

  if (!tenantId) {
    return <div className="text-txt-dim p-8">No tenant context.</div>;
  }

  const [campaigns, metaKey] = await Promise.all([
    prisma.campaign.findMany({
      where: {
        tenantId,
        channel: { in: SOCIAL_CHANNELS },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    getIntegration(tenantId, "META"),
  ]);

  const serialisedCampaigns = campaigns.map((c) => ({
    id: c.id,
    name: c.name,
    channel: c.channel as string,
    template: c.template,
    audience: c.audience,
    status: c.status as string,
    scheduledAt: c.scheduledAt ? c.scheduledAt.toISOString() : null,
    analytics: c.analytics as Record<string, unknown>,
    createdAt: c.createdAt.toISOString(),
  }));

  return (
    <SocialClient
      campaigns={serialisedCampaigns}
      hasMetaKey={!!metaKey}
      tenantId={tenantId}
    />
  );
}
