import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentUser, resolveTenantId } from "@/lib/session";
import { audit } from "@/lib/audit";
import { Role } from "@prisma/client";

const ALLOWED_ROLES: Role[] = ["SUPER_ADMIN", "ADMIN", "MANAGER"];

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!ALLOWED_ROLES.includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const tenantId = await resolveTenantId(user);
    if (!tenantId) return NextResponse.json({ error: "No tenant" }, { status: 400 });

    const body = await req.json();

    // Verify ownership
    const existing = await prisma.workflowTrigger.findFirst({
      where: { id: params.id, tenantId },
    });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const updated = await prisma.workflowTrigger.update({
      where: { id: params.id },
      data: {
        ...(body.isActive !== undefined && { isActive: Boolean(body.isActive) }),
        ...(body.name !== undefined && { name: String(body.name) }),
        ...(body.event !== undefined && { event: body.event as object }),
        ...(body.actions !== undefined && { actions: body.actions as object }),
      },
    });

    await audit({
      tenantId,
      action: "UPDATE",
      entity: "WorkflowTrigger",
      entityId: params.id,
      performedById: user.id,
      meta: { changes: Object.keys(body) },
    });

    return NextResponse.json({ ...updated, createdAt: updated.createdAt.toISOString() });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!ALLOWED_ROLES.includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const tenantId = await resolveTenantId(user);
    if (!tenantId) return NextResponse.json({ error: "No tenant" }, { status: 400 });

    const existing = await prisma.workflowTrigger.findFirst({
      where: { id: params.id, tenantId },
    });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.workflowTrigger.delete({ where: { id: params.id } });

    await audit({
      tenantId,
      action: "DELETE",
      entity: "WorkflowTrigger",
      entityId: params.id,
      performedById: user.id,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
