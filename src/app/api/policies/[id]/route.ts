import { NextRequest, NextResponse } from "next/server";
import { requireRole, resolveTenantId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { Role } from "@prisma/client";

const EDIT_ROLES: Role[] = ["SUPER_ADMIN", "ADMIN", "MANAGER"];

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireRole(EDIT_ROLES);
    const tenantId = await resolveTenantId(user);
    if (!tenantId) {
      return NextResponse.json({ error: "No tenant" }, { status: 400 });
    }

    const { id } = params;
    const body = await req.json();
    const { title, category, body: policyBody } = body;

    const existing = await prisma.policy.findFirst({ where: { id, tenantId } });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const validCategories = ["HR", "LEAVE", "SALES", "CONDUCT"];
    if (category && !validCategories.includes(category)) {
      return NextResponse.json({ error: "Invalid category" }, { status: 400 });
    }

    const updated = await prisma.policy.update({
      where: { id },
      data: {
        ...(title && { title: String(title).trim() }),
        ...(category && { category }),
        ...(policyBody && { body: String(policyBody).trim() }),
      },
    });

    await audit({ tenantId, action: "UPDATE", entity: "Policy", entityId: id, performedById: user.id, meta: { title, category } });

    return NextResponse.json(updated);
  } catch (err: any) {
    if (err?.digest?.startsWith("NEXT_REDIRECT")) throw err;
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireRole(EDIT_ROLES);
    const tenantId = await resolveTenantId(user);
    if (!tenantId) {
      return NextResponse.json({ error: "No tenant" }, { status: 400 });
    }

    const { id } = params;

    const existing = await prisma.policy.findFirst({ where: { id, tenantId } });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.policy.delete({ where: { id } });

    await audit({ tenantId, action: "DELETE", entity: "Policy", entityId: id, performedById: user.id, meta: { title: existing.title } });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    if (err?.digest?.startsWith("NEXT_REDIRECT")) throw err;
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
}
