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

    const projects = await prisma.reraProject.findMany({
      where: { tenantId },
      orderBy: { expiryAt: "asc" },
    });

    return NextResponse.json(projects);
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
    const { projectName, reraNo, registeredAt, expiryAt } = body;

    if (!projectName || !reraNo || !registeredAt || !expiryAt) {
      return NextResponse.json(
        { error: "projectName, reraNo, registeredAt, expiryAt are required." },
        { status: 400 }
      );
    }

    // Default doc checklist for a new RERA project
    const defaultDocs = [
      { name: "RERA Registration Certificate", ok: false },
      { name: "Approved Building Plan", ok: false },
      { name: "Land Title Document", ok: false },
      { name: "Environmental Clearance", ok: false },
      { name: "NOC from Fire Department", ok: false },
      { name: "Commencement Certificate", ok: false },
      { name: "Quarterly Update Filed", ok: false },
    ];

    const project = await prisma.reraProject.create({
      data: {
        tenantId,
        projectName: String(projectName),
        reraNo: String(reraNo),
        registeredAt: new Date(registeredAt),
        expiryAt: new Date(expiryAt),
        docs: defaultDocs as any,
        deadlines: [] as any,
      },
    });

    await audit({
      tenantId,
      action: "CREATE",
      entity: "ReraProject",
      entityId: project.id,
      performedById: user.id,
      meta: { projectName, reraNo },
    });

    return NextResponse.json(project, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
