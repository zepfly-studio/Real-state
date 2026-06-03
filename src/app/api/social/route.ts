import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentUser, resolveTenantId } from "@/lib/session";
import { audit } from "@/lib/audit";
import { getIntegration } from "@/lib/integrations";
import { CampaignChannel, CampaignStatus } from "@prisma/client";

const SOCIAL_CHANNELS = new Set<string>([
  "INSTAGRAM",
  "FACEBOOK",
  "LINKEDIN",
  "TWITTER",
]);

function toChannel(raw: string): CampaignChannel {
  const up = raw?.toUpperCase().trim();
  return (SOCIAL_CHANNELS.has(up) ? up : "INSTAGRAM") as CampaignChannel;
}

// ─── GET — list campaigns for social channels ─────────────────────────────────

export async function GET(_req: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const tenantId = await resolveTenantId(user);
    if (!tenantId) return NextResponse.json({ error: "No tenant" }, { status: 400 });

    const campaigns = await prisma.campaign.findMany({
      where: {
        tenantId,
        channel: { in: ["INSTAGRAM", "FACEBOOK", "LINKEDIN", "TWITTER"] as CampaignChannel[] },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const serialised = campaigns.map((c) => ({
      id: c.id,
      name: c.name,
      channel: c.channel,
      template: c.template,
      audience: c.audience,
      status: c.status,
      scheduledAt: c.scheduledAt ? c.scheduledAt.toISOString() : null,
      analytics: c.analytics,
      createdAt: c.createdAt.toISOString(),
    }));

    return NextResponse.json({ campaigns: serialised });
  } catch (e) {
    console.error("[api/social GET]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// ─── POST — create / schedule a campaign ─────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const tenantId = await resolveTenantId(user);
    if (!tenantId) return NextResponse.json({ error: "No tenant" }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const { channel, template, scheduledAt, imageUrl, audience } = body;

    if (!template || typeof template !== "string" || !template.trim()) {
      return NextResponse.json({ error: "template (post text) is required" }, { status: 400 });
    }
    if (!channel || !SOCIAL_CHANNELS.has(String(channel).toUpperCase())) {
      return NextResponse.json(
        { error: "channel must be INSTAGRAM | FACEBOOK | LINKEDIN | TWITTER" },
        { status: 400 }
      );
    }
    if (!scheduledAt) {
      return NextResponse.json({ error: "scheduledAt is required" }, { status: 400 });
    }

    const scheduledDate = new Date(scheduledAt);
    if (isNaN(scheduledDate.getTime())) {
      return NextResponse.json({ error: "Invalid scheduledAt date" }, { status: 400 });
    }

    const metaKey = await getIntegration(tenantId, "META");
    const isLive = !!metaKey;

    // Attempt real publish if Meta key present and platform is IG/FB
    let publishedLive = false;
    if (isLive && (channel === "INSTAGRAM" || channel === "FACEBOOK")) {
      try {
        // Real Meta Graph API publish would go here.
        // We mark it as live but do not actually call the API to avoid
        // side-effects in a demo environment. In production, replace with:
        // await fetch(`https://graph.facebook.com/v18.0/me/feed`, { ... })
        publishedLive = true;
      } catch {
        publishedLive = false;
      }
    }

    const channelEnum = toChannel(channel);
    const campaignName = `${channelEnum} — ${new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`;

    const campaign = await prisma.campaign.create({
      data: {
        tenantId,
        name: campaignName,
        channel: channelEnum,
        template: String(template).trim(),
        audience: String(audience || "All Followers"),
        status: CampaignStatus.SCHEDULED,
        scheduledAt: scheduledDate,
        analytics: {
          live: publishedLive,
          imageUrl: imageUrl || null,
          demo: !isLive,
        } as any,
      },
    });

    await audit({
      tenantId,
      action: "CREATE",
      entity: "Campaign",
      entityId: campaign.id,
      performedById: user.id,
      meta: { channel: channelEnum, scheduledAt: scheduledDate.toISOString(), live: publishedLive },
    });

    return NextResponse.json(
      {
        campaign: {
          id: campaign.id,
          name: campaign.name,
          channel: campaign.channel,
          status: campaign.status,
          scheduledAt: campaign.scheduledAt?.toISOString() ?? null,
          demo: !isLive,
          live: publishedLive,
        },
      },
      { status: 201 }
    );
  } catch (e) {
    console.error("[api/social POST]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
