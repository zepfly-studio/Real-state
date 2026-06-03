import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentUser, resolveTenantId } from "@/lib/session";
import { ActivityType } from "@prisma/client";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const tenantId = await resolveTenantId(user);
    if (!tenantId) return NextResponse.json({ error: "No tenant" }, { status: 400 });

    // Verify lead belongs to tenant
    const lead = await prisma.lead.findFirst({ where: { id: params.id, tenantId } });
    if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const activities = await prisma.activity.findMany({
      where: { leadId: params.id, tenantId },
      orderBy: { createdAt: "desc" },
      include: { createdBy: { select: { id: true, name: true, avatarColor: true } } },
    });

    return NextResponse.json(activities);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const tenantId = await resolveTenantId(user);
    if (!tenantId) return NextResponse.json({ error: "No tenant" }, { status: 400 });

    // Verify lead belongs to tenant
    const lead = await prisma.lead.findFirst({ where: { id: params.id, tenantId } });
    if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await req.json();
    const { type, description } = body;

    if (!type || !description) {
      return NextResponse.json({ error: "type and description are required" }, { status: 400 });
    }

    const activity = await prisma.activity.create({
      data: {
        tenantId,
        leadId: params.id,
        type: type as ActivityType,
        description: String(description),
        createdById: user.id,
      },
      include: { createdBy: { select: { id: true, name: true, avatarColor: true } } },
    });

    return NextResponse.json(activity, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
