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

    const visitor = await prisma.visitor.findFirst({
      where: { id: params.id, tenantId },
    });

    if (!visitor) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(visitor);
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

    const existing = await prisma.visitor.findFirst({
      where: { id: params.id, tenantId },
    });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await req.json();
    const updateData: Record<string, unknown> = {};

    if (body.checkOut !== undefined) {
      updateData.checkOut = new Date(body.checkOut);
    }

    const visitor = await prisma.visitor.update({
      where: { id: params.id },
      data: updateData,
    });

    await audit({
      tenantId,
      action: "UPDATE",
      entity: "Visitor",
      entityId: params.id,
      performedById: user.id,
      meta: { action: "checkout", visitorName: existing.name },
    });

    return NextResponse.json(visitor);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
