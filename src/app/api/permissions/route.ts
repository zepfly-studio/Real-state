import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentUser, resolveTenantId } from "@/lib/session";
import { audit } from "@/lib/audit";
import { Role } from "@prisma/client";

export async function POST(req: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "SUPER_ADMIN" && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const tenantId = await resolveTenantId(user);
    if (!tenantId) return NextResponse.json({ error: "No tenant" }, { status: 400 });

    const body = await req.json();
    const { role, moduleKey, canView } = body;

    if (!role || !moduleKey || canView === undefined) {
      return NextResponse.json({ error: "role, moduleKey and canView are required" }, { status: 400 });
    }

    // Validate role
    const validRoles: Role[] = ["ADMIN", "MANAGER", "EMPLOYEE", "CLIENT", "CHANNEL_PARTNER"];
    if (!validRoles.includes(role as Role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    // Upsert using the @@unique([tenantId, role, moduleKey]) constraint
    const perm = await prisma.modulePermission.upsert({
      where: {
        tenantId_role_moduleKey: {
          tenantId,
          role: role as Role,
          moduleKey: String(moduleKey),
        },
      },
      create: {
        tenantId,
        role: role as Role,
        moduleKey: String(moduleKey),
        canView: Boolean(canView),
        canEdit: false,
      },
      update: {
        canView: Boolean(canView),
      },
    });

    await audit({
      tenantId,
      action: "PERMISSION_UPDATED",
      entity: "ModulePermission",
      entityId: perm.id,
      performedById: user.id,
      meta: { role, moduleKey, canView },
    });

    return NextResponse.json(perm);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
