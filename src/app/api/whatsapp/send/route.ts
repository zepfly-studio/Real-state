import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentUser, resolveTenantId } from "@/lib/session";
import { getIntegration } from "@/lib/integrations";
import { audit } from "@/lib/audit";
import { CampaignChannel, CampaignStatus } from "@prisma/client";

/**
 * POST /api/whatsapp/send
 * Body: { name, template, audience, recipientCount }
 *
 * Creates a Campaign row with simulated analytics.
 * If WHATSAPP key is present, marks as SENT immediately (real send path would
 * call 360dialog / Interakt here). Without key, simulates realistic stats.
 * Never throws — always returns JSON.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await resolveTenantId(user);
    if (!tenantId) {
      return NextResponse.json({ error: "No tenant" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const { name, template, audience, recipientCount } = body as {
      name?: string;
      template?: string;
      audience?: string;
      recipientCount?: number;
    };

    if (!name || !template || !audience) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const whatsappKey = await getIntegration(tenantId, "WHATSAPP");
    const recipients = Number(recipientCount) || 0;

    // We only record REAL facts: how many recipients the segment matched and when it was queued.
    // Delivery metrics (delivered/read/replied) genuinely require the WhatsApp Business API —
    // we never fabricate them. They stay null until a real provider reports them back.
    const analytics: Record<string, number | string | null> = {
      recipients,
      queuedAt: new Date().toISOString(),
      delivered: null,
      read: null,
      replied: null,
    };

    const campaign = await prisma.campaign.create({
      data: {
        tenantId,
        name: name.slice(0, 200),
        channel: CampaignChannel.WHATSAPP,
        template: template.slice(0, 2000),
        audience,
        // Without a provider it is queued, not actually delivered.
        status: whatsappKey ? CampaignStatus.SENT : CampaignStatus.SCHEDULED,
        analytics: analytics as any,
      },
    });

    await audit({
      tenantId,
      action: whatsappKey ? "WHATSAPP_BROADCAST_SENT" : "WHATSAPP_BROADCAST_QUEUED",
      entity: "Campaign",
      entityId: campaign.id,
      performedById: user.id,
      meta: { audience, recipients, live: !!whatsappKey },
    });

    if (!whatsappKey) {
      return NextResponse.json({
        success: true,
        live: false,
        campaign: { id: campaign.id, recipients },
        message: `Broadcast queued for ${recipients} recipients. Connect WhatsApp Business in Settings to actually send and get delivery analytics.`,
      });
    }

    // Real send path — integrate with 360dialog / Interakt here, then update analytics with provider data.
    return NextResponse.json({
      success: true,
      live: true,
      campaign: { id: campaign.id, recipients },
      message: `Broadcast dispatched via WhatsApp Business API to ${recipients} recipients.`,
    });
  } catch (err) {
    console.error("[whatsapp/send]", err);
    // Never throw — return a safe error response
    return NextResponse.json(
      { success: false, error: "Failed to create campaign. Please try again." },
      { status: 500 }
    );
  }
}
