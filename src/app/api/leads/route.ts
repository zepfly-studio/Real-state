import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentUser, resolveTenantId } from "@/lib/session";
import { audit } from "@/lib/audit";
import { ActivityType, LeadSource, LeadStage, LeadTemperature } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const tenantId = await resolveTenantId(user);
    if (!tenantId) return NextResponse.json({ error: "No tenant" }, { status: 400 });

    const leads = await prisma.lead.findMany({
      where: { tenantId },
      include: { assignedTo: true, activities: { orderBy: { createdAt: "desc" }, take: 1 } },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json(leads);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const tenantId = await resolveTenantId(user);
    if (!tenantId) return NextResponse.json({ error: "No tenant" }, { status: 400 });

    const body = await req.json();
    const {
      name,
      phone,
      email,
      propertyType,
      location,
      source,
      temperature,
      stage,
      value,
      assignedToId,
      notes,
      nextFollowUp,
    } = body;

    if (!name || !phone || !propertyType || !location) {
      return NextResponse.json({ error: "Missing required fields: name, phone, propertyType, location" }, { status: 400 });
    }

    const lead = await prisma.lead.create({
      data: {
        tenantId,
        name: String(name),
        phone: String(phone),
        email: email ? String(email) : null,
        propertyType: String(propertyType),
        location: String(location),
        source: (source as LeadSource) || LeadSource.WEBSITE,
        temperature: (temperature as LeadTemperature) || LeadTemperature.WARM,
        stage: (stage as LeadStage) || LeadStage.NEW,
        value: value ? Number(value) : 0,
        assignedToId: assignedToId || null,
        notes: notes || null,
        nextFollowUp: nextFollowUp ? new Date(nextFollowUp) : null,
      },
    });

    // Create initial NOTE activity
    await prisma.activity.create({
      data: {
        tenantId,
        leadId: lead.id,
        type: ActivityType.NOTE,
        description: "Lead created",
        createdById: user.id,
      },
    });

    await audit({
      tenantId,
      action: "CREATE",
      entity: "Lead",
      entityId: lead.id,
      performedById: user.id,
      meta: { name, phone },
    });

    return NextResponse.json(lead, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
