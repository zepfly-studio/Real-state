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

    const project = await prisma.reraProject.findFirst({
      where: { id: params.id, tenantId },
    });

    if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(project);
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

    const existing = await prisma.reraProject.findFirst({
      where: { id: params.id, tenantId },
    });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await req.json();
    const updateData: Record<string, unknown> = {};

    if (body.docs !== undefined) updateData.docs = body.docs;
    if (body.deadlines !== undefined) updateData.deadlines = body.deadlines;
    if (body.projectName !== undefined) updateData.projectName = String(body.projectName);
    if (body.reraNo !== undefined) updateData.reraNo = String(body.reraNo);
    if (body.registeredAt !== undefined) updateData.registeredAt = new Date(body.registeredAt);
    if (body.expiryAt !== undefined) updateData.expiryAt = new Date(body.expiryAt);

    const project = await prisma.reraProject.update({
      where: { id: params.id },
      data: updateData,
    });

    await audit({
      tenantId,
      action: "UPDATE",
      entity: "ReraProject",
      entityId: params.id,
      performedById: user.id,
      meta: { changes: Object.keys(updateData) },
    });

    return NextResponse.json(project);
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

    const existing = await prisma.reraProject.findFirst({
      where: { id: params.id, tenantId },
    });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.reraProject.delete({ where: { id: params.id } });

    await audit({
      tenantId,
      action: "DELETE",
      entity: "ReraProject",
      entityId: params.id,
      performedById: user.id,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
