import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentUser, resolveTenantId } from "@/lib/session";
import { audit } from "@/lib/audit";

// ─── DELETE — cancel / delete a scheduled or draft post ──────────────────────

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const tenantId = await resolveTenantId(user);
    if (!tenantId) return NextResponse.json({ error: "No tenant" }, { status: 400 });

    const { id } = params;
    if (!id) return NextResponse.json({ error: "Campaign ID required" }, { status: 400 });

    // Verify ownership and allow-list for deletion
    const campaign = await prisma.campaign.findFirst({
      where: { id, tenantId },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (campaign.status === "SENT") {
      return NextResponse.json(
        { error: "Cannot delete a post that has already been sent" },
        { status: 422 }
      );
    }

    await prisma.campaign.delete({ where: { id } });

    await audit({
      tenantId,
      action: "DELETE",
      entity: "Campaign",
      entityId: id,
      performedById: user.id,
      meta: { channel: campaign.channel, status: campaign.status },
    });

    return NextResponse.json({ success: true, id });
  } catch (e) {
    console.error("[api/social/:id DELETE]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
