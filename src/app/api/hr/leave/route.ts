import { NextRequest, NextResponse } from "next/server";
import { currentUser, resolveTenantId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = await resolveTenantId(user);
  if (!tenantId) return NextResponse.json({ error: "No tenant" }, { status: 400 });

  const rows = await prisma.leave.findMany({
    where: { tenantId },
    include: { user: { select: { id: true, name: true, avatarColor: true } } },
    orderBy: { from: "desc" },
  });

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = await resolveTenantId(user);
  if (!tenantId) return NextResponse.json({ error: "No tenant" }, { status: 400 });

  const body = await req.json();
  const { type, from, to, reason } = body as {
    type: string;
    from: string;
    to: string;
    reason?: string;
  };

  if (!type || !from || !to) {
    return NextResponse.json({ error: "type, from and to are required" }, { status: 400 });
  }

  const record = await prisma.leave.create({
    data: {
      tenantId,
      userId: user.id,
      type,
      from: new Date(from),
      to: new Date(to),
      reason,
      status: "PENDING",
    },
  });

  await audit({
    tenantId,
    action: "LEAVE_APPLIED",
    entity: "Leave",
    entityId: record.id,
    performedById: user.id,
    meta: { type, from, to },
  });

  return NextResponse.json(record, { status: 201 });
}
