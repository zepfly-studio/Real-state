import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentUser, resolveTenantId } from "@/lib/session";
import { audit } from "@/lib/audit";
import { PropertyStatus } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const tenantId = await resolveTenantId(user);
    if (!tenantId) return NextResponse.json({ error: "No tenant" }, { status: 400 });

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") as PropertyStatus | null;
    const project = searchParams.get("project");

    const where: Record<string, unknown> = { tenantId };
    if (status) where.status = status;
    if (project) where.projectName = project;

    const properties = await prisma.property.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(properties);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const tenantId = await resolveTenantId(user);
    if (!tenantId) return NextResponse.json({ error: "No tenant" }, { status: 400 });

    const body = await req.json();
    const { name, projectName, unitType, sizeSqft, pricePerSqft, totalPrice, reraId, location } = body;

    if (!name || !projectName || !unitType || !sizeSqft || !pricePerSqft) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const computedTotal = totalPrice ?? Number(sizeSqft) * Number(pricePerSqft);

    const property = await prisma.property.create({
      data: {
        tenantId,
        name: String(name),
        projectName: String(projectName),
        unitType: String(unitType),
        sizeSqft: Number(sizeSqft),
        pricePerSqft: Number(pricePerSqft),
        totalPrice: computedTotal,
        status: PropertyStatus.AVAILABLE,
        reraId: reraId ? String(reraId) : null,
        location: location ? String(location) : null,
      },
    });

    await audit({
      tenantId,
      action: "CREATE",
      entity: "Property",
      entityId: property.id,
      performedById: user.id,
      meta: { name, projectName, unitType },
    });

    return NextResponse.json(property, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
