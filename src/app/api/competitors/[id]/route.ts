import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentUser, resolveTenantId } from "@/lib/session";
import { audit } from "@/lib/audit";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const tenantId = await resolveTenantId(user);
    if (!tenantId) return NextResponse.json({ error: "No tenant" }, { status: 400 });

    const competitor = await prisma.competitor.findFirst({
      where: { id: params.id, tenantId },
    });

    if (!competitor) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(competitor);
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

    const existing = await prisma.competitor.findFirst({
      where: { id: params.id, tenantId },
    });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await req.json();
    const updateData: Record<string, unknown> = {};

    if (body.name !== undefined) updateData.name = String(body.name);
    if (body.project !== undefined) updateData.project = String(body.project);
    if (body.location !== undefined) updateData.location = body.location ? String(body.location) : null;
    if (body.pricePerSqft !== undefined) updateData.pricePerSqft = Number(body.pricePerSqft);
    if (body.amenities !== undefined) updateData.amenities = body.amenities;
    if (body.possession !== undefined) updateData.possession = body.possession ? String(body.possession) : null;

    const competitor = await prisma.competitor.update({
      where: { id: params.id },
      data: updateData,
    });

    await audit({
      tenantId,
      action: "UPDATE",
      entity: "Competitor",
      entityId: params.id,
      performedById: user.id,
      meta: { changes: Object.keys(updateData) },
    });

    return NextResponse.json(competitor);
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

    const existing = await prisma.competitor.findFirst({
      where: { id: params.id, tenantId },
    });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.competitor.delete({ where: { id: params.id } });

    await audit({
      tenantId,
      action: "DELETE",
      entity: "Competitor",
      entityId: params.id,
      performedById: user.id,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
