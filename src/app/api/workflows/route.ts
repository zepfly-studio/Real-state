import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentUser, resolveTenantId } from "@/lib/session";
import { audit } from "@/lib/audit";
import { Role } from "@prisma/client";

const ALLOWED_ROLES: Role[] = ["SUPER_ADMIN", "ADMIN", "MANAGER"];

export async function GET(_req: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!ALLOWED_ROLES.includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const tenantId = await resolveTenantId(user);
    if (!tenantId) return NextResponse.json({ error: "No tenant" }, { status: 400 });

    const triggers = await prisma.workflowTrigger.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(
      triggers.map((t) => ({
        ...t,
        createdAt: t.createdAt.toISOString(),
      }))
    );
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!ALLOWED_ROLES.includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const tenantId = await resolveTenantId(user);
    if (!tenantId) return NextResponse.json({ error: "No tenant" }, { status: 400 });

    const body = await req.json();
    const { name, event, actions, isActive } = body;

    if (!name || !event || !actions) {
      return NextResponse.json(
        { error: "Missing required fields: name, event, actions" },
        { status: 400 }
      );
    }

    const trigger = await prisma.workflowTrigger.create({
      data: {
        tenantId,
        name: String(name),
        event: event as object,
        actions: actions as object,
        isActive: isActive !== false,
      },
    });

    await audit({
      tenantId,
      action: "CREATE",
      entity: "WorkflowTrigger",
      entityId: trigger.id,
      performedById: user.id,
      meta: { name },
    });

    return NextResponse.json({ ...trigger, createdAt: trigger.createdAt.toISOString() }, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
