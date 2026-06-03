import { NextRequest, NextResponse } from "next/server";
import { currentUser, resolveTenantId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = await resolveTenantId(user);
  if (!tenantId) return NextResponse.json({ error: "No tenant" }, { status: 400 });

  const rows = await prisma.document.findMany({
    where: { tenantId },
    include: { user: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = await resolveTenantId(user);
  if (!tenantId) return NextResponse.json({ error: "No tenant" }, { status: 400 });

  const body = await req.json();
  const { type, name, userId } = body as {
    type: string;
    name: string;
    userId?: string;
  };

  if (!type || !name) {
    return NextResponse.json({ error: "type and name are required" }, { status: 400 });
  }

  const record = await prisma.document.create({
    data: {
      tenantId,
      userId: userId ?? user.id,
      type,
      name,
      url: `/uploads/${name.replace(/\s+/g, "-").toLowerCase()}-${Date.now()}`,
    },
  });

  await audit({
    tenantId,
    action: "DOCUMENT_ADDED",
    entity: "Document",
    entityId: record.id,
    performedById: user.id,
    meta: { type, name },
  });

  return NextResponse.json(record, { status: 201 });
}
