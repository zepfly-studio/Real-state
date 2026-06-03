import { NextRequest, NextResponse } from "next/server";
import { currentUser, resolveTenantId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { AttendanceStatus } from "@prisma/client";

export async function GET(req: NextRequest) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = await resolveTenantId(user);
  if (!tenantId) return NextResponse.json({ error: "No tenant" }, { status: 400 });

  const { searchParams } = new URL(req.url);
  const days = parseInt(searchParams.get("days") ?? "14");

  const since = new Date();
  since.setDate(since.getDate() - days);

  const rows = await prisma.attendance.findMany({
    where: { tenantId, date: { gte: since } },
    include: { user: { select: { id: true, name: true } } },
    orderBy: { date: "desc" },
  });

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = await resolveTenantId(user);
  if (!tenantId) return NextResponse.json({ error: "No tenant" }, { status: 400 });

  const body = await req.json();
  const { userId, date, status, checkIn, checkOut } = body as {
    userId?: string;
    date: string;
    status: AttendanceStatus;
    checkIn?: string;
    checkOut?: string;
  };

  // Default to current user if no userId provided (EMPLOYEE marking own)
  const targetUserId = userId ?? user.id;

  // Only ADMIN/MANAGER can mark other users
  if (
    targetUserId !== user.id &&
    !["ADMIN", "MANAGER", "SUPER_ADMIN"].includes(user.role)
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const dateObj = new Date(date);
  dateObj.setHours(0, 0, 0, 0);

  // Upsert by tenantId + userId + date
  const existing = await prisma.attendance.findFirst({
    where: { tenantId, userId: targetUserId, date: dateObj },
  });

  let record;
  if (existing) {
    record = await prisma.attendance.update({
      where: { id: existing.id },
      data: { status, checkIn, checkOut },
    });
  } else {
    record = await prisma.attendance.create({
      data: { tenantId, userId: targetUserId, date: dateObj, status, checkIn, checkOut },
    });
  }

  await audit({
    tenantId,
    action: existing ? "ATTENDANCE_UPDATED" : "ATTENDANCE_MARKED",
    entity: "Attendance",
    entityId: record.id,
    performedById: user.id,
    meta: { userId: targetUserId, date, status },
  });

  return NextResponse.json(record);
}
