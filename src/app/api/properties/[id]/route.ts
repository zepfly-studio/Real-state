import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentUser, resolveTenantId } from "@/lib/session";
import { audit } from "@/lib/audit";
import { PropertyStatus, Role } from "@prisma/client";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const allowedRoles: Role[] = [Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER];
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const tenantId = await resolveTenantId(user);
    if (!tenantId) return NextResponse.json({ error: "No tenant" }, { status: 400 });

    const existing = await prisma.property.findFirst({ where: { id: params.id, tenantId } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await req.json();
    const { status, name, projectName, unitType, sizeSqft, pricePerSqft, totalPrice, reraId, location } = body;

    const updateData: Record<string, unknown> = {};
    if (status !== undefined) updateData.status = status as PropertyStatus;
    if (name !== undefined) updateData.name = String(name);
    if (projectName !== undefined) updateData.projectName = String(projectName);
    if (unitType !== undefined) updateData.unitType = String(unitType);
    if (sizeSqft !== undefined) updateData.sizeSqft = Number(sizeSqft);
    if (pricePerSqft !== undefined) updateData.pricePerSqft = Number(pricePerSqft);
    if (totalPrice !== undefined) updateData.totalPrice = Number(totalPrice);
    if (reraId !== undefined) updateData.reraId = reraId ? String(reraId) : null;
    if (location !== undefined) updateData.location = location ? String(location) : null;

    const property = await prisma.property.update({
      where: { id: params.id },
      data: updateData,
    });

    await audit({
      tenantId,
      action: "UPDATE",
      entity: "Property",
      entityId: params.id,
      performedById: user.id,
      meta: { changes: body },
    });

    return NextResponse.json(property);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const tenantId = await resolveTenantId(user);
    if (!tenantId) return NextResponse.json({ error: "No tenant" }, { status: 400 });

    const property = await prisma.property.findFirst({
      where: { id: params.id, tenantId },
    });

    if (!property) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(property);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
