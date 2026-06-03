import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentUser, resolveTenantId } from "@/lib/session";
import { audit } from "@/lib/audit";
import { Role } from "@prisma/client";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "SUPER_ADMIN" && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const tenantId = await resolveTenantId(user);
    if (!tenantId) return NextResponse.json({ error: "No tenant" }, { status: 400 });

    const targetId = params.id;

    // Guard: ensure target user belongs to this tenant
    const target = await prisma.user.findFirst({
      where: { id: targetId, tenantId },
    });
    if (!target) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Guard: cannot edit a SUPER_ADMIN or promote to SUPER_ADMIN
    if (target.role === "SUPER_ADMIN") {
      return NextResponse.json({ error: "Cannot edit SUPER_ADMIN" }, { status: 403 });
    }

    const body = await req.json();
    const { name, role, isActive } = body;

    if (role !== undefined) {
      if (role === "SUPER_ADMIN") {
        return NextResponse.json({ error: "Cannot assign SUPER_ADMIN role" }, { status: 400 });
      }
      const validRoles: Role[] = ["ADMIN", "MANAGER", "EMPLOYEE", "CLIENT", "CHANNEL_PARTNER"];
      if (!validRoles.includes(role as Role)) {
        return NextResponse.json({ error: "Invalid role" }, { status: 400 });
      }
    }

    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = String(name).trim();
    if (role !== undefined) updates.role = role as Role;
    if (isActive !== undefined) updates.isActive = Boolean(isActive);

    const updated = await prisma.user.update({
      where: { id: targetId },
      data: updates,
    });

    await audit({
      tenantId,
      action: "USER_UPDATED",
      entity: "User",
      entityId: updated.id,
      performedById: user.id,
      meta: { changes: updates, userName: updated.name },
    });

    const { passwordHash: _ph, ...safeUser } = updated;
    return NextResponse.json(safeUser);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
