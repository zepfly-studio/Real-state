import { NextRequest, NextResponse } from "next/server";
import { currentUser, resolveTenantId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { LeaveStatus } from "@prisma/client";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Only ADMIN or MANAGER can approve/reject
  if (!["ADMIN", "MANAGER", "SUPER_ADMIN"].includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const tenantId = await resolveTenantId(user);
  if (!tenantId) return NextResponse.json({ error: "No tenant" }, { status: 400 });

  const body = await req.json();
  const { status } = body as { status: LeaveStatus };

  if (!["APPROVED", "REJECTED"].includes(status)) {
    return NextResponse.json(
      { error: "status must be APPROVED or REJECTED" },
      { status: 400 }
    );
  }

  // Verify leave belongs to this tenant
  const leave = await prisma.leave.findFirst({
    where: { id: params.id, tenantId },
  });
  if (!leave) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.leave.update({
    where: { id: params.id },
    data: { status },
  });

  await audit({
    tenantId,
    action: status === "APPROVED" ? "LEAVE_APPROVED" : "LEAVE_REJECTED",
    entity: "Leave",
    entityId: params.id,
    performedById: user.id,
    meta: { leaveUserId: leave.userId, status },
  });

  return NextResponse.json(updated);
}
