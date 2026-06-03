import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentUser, resolveTenantId } from "@/lib/session";
import { audit } from "@/lib/audit";

export async function GET(req: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const tenantId = await resolveTenantId(user);
    if (!tenantId) return NextResponse.json({ error: "No tenant" }, { status: 400 });

    const competitors = await prisma.competitor.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(competitors);
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
    const { name, project, location, pricePerSqft, amenities, possession } = body;

    if (!name || !project || pricePerSqft === undefined) {
      return NextResponse.json(
        { error: "name, project, and pricePerSqft are required." },
        { status: 400 }
      );
    }

    const competitor = await prisma.competitor.create({
      data: {
        tenantId,
        name: String(name),
        project: String(project),
        location: location ? String(location) : null,
        pricePerSqft: Number(pricePerSqft),
        amenities: Array.isArray(amenities) ? (amenities as any) : [],
        possession: possession ? String(possession) : null,
      },
    });

    await audit({
      tenantId,
      action: "CREATE",
      entity: "Competitor",
      entityId: competitor.id,
      performedById: user.id,
      meta: { name, project, pricePerSqft },
    });

    return NextResponse.json(competitor, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
