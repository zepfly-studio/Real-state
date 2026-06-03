import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentUser, resolveTenantId } from "@/lib/session";
import { audit } from "@/lib/audit";
import { ActivityType, LeadStage, LeadTemperature } from "@prisma/client";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const tenantId = await resolveTenantId(user);
    if (!tenantId) return NextResponse.json({ error: "No tenant" }, { status: 400 });

    const lead = await prisma.lead.findFirst({
      where: { id: params.id, tenantId },
      include: {
        assignedTo: true,
        activities: {
          orderBy: { createdAt: "desc" },
          include: { createdBy: true },
        },
      },
    });

    if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(lead);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const tenantId = await resolveTenantId(user);
    if (!tenantId) return NextResponse.json({ error: "No tenant" }, { status: 400 });

    // Verify lead belongs to tenant
    const existing = await prisma.lead.findFirst({
      where: { id: params.id, tenantId },
    });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await req.json();
    const { stage, assignedToId, notes, temperature, value, nextFollowUp } = body;

    const updateData: Record<string, unknown> = {};
    if (stage !== undefined) updateData.stage = stage as LeadStage;
    if (assignedToId !== undefined) updateData.assignedToId = assignedToId || null;
    if (notes !== undefined) updateData.notes = notes;
    if (temperature !== undefined) updateData.temperature = temperature as LeadTemperature;
    if (value !== undefined) updateData.value = Number(value);
    if (nextFollowUp !== undefined) updateData.nextFollowUp = nextFollowUp ? new Date(nextFollowUp) : null;

    const lead = await prisma.lead.update({
      where: { id: params.id },
      data: updateData,
    });

    // If stage changed, log a STAGE_CHANGE activity
    if (stage && stage !== existing.stage) {
      await prisma.activity.create({
        data: {
          tenantId,
          leadId: params.id,
          type: ActivityType.STAGE_CHANGE,
          description: `Stage changed from ${existing.stage} to ${stage}`,
          createdById: user.id,
        },
      });
    }

    await audit({
      tenantId,
      action: "UPDATE",
      entity: "Lead",
      entityId: params.id,
      performedById: user.id,
      meta: { changes: body },
    });

    return NextResponse.json(lead);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const tenantId = await resolveTenantId(user);
    if (!tenantId) return NextResponse.json({ error: "No tenant" }, { status: 400 });

    const existing = await prisma.lead.findFirst({ where: { id: params.id, tenantId } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.lead.delete({ where: { id: params.id } });

    await audit({
      tenantId,
      action: "DELETE",
      entity: "Lead",
      entityId: params.id,
      performedById: user.id,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
