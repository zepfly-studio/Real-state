import { requireUser, resolveTenantId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { CallingClient } from "./client";
import { Role, LeadStage } from "@prisma/client";

const ALLOWED_ROLES: Role[] = ["SUPER_ADMIN", "ADMIN", "MANAGER", "EMPLOYEE"];

export default async function CallingPage() {
  const user = await requireUser();
  if (!ALLOWED_ROLES.includes(user.role)) {
    return <div className="text-txt-dim p-8">Access restricted.</div>;
  }

  const tenantId = await resolveTenantId(user);
  if (!tenantId) {
    return <div className="text-txt-dim p-8">No tenant context.</div>;
  }

  const isEmployee = user.role === "EMPLOYEE";

  // Leads needing follow-up
  const leadWhere = {
    tenantId,
    stage: { notIn: ["CLOSED_WON", "CLOSED_LOST"] as LeadStage[] },
    ...(isEmployee ? { assignedToId: user.id } : {}),
  };

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const [leads, callLogs, target, teamMembers] = await Promise.all([
    prisma.lead.findMany({
      where: leadWhere,
      orderBy: [{ temperature: "asc" }, { updatedAt: "asc" }],
      take: 50,
      select: {
        id: true,
        name: true,
        phone: true,
        temperature: true,
        stage: true,
        assignedToId: true,
        nextFollowUp: true,
        notes: true,
      },
    }),
    prisma.callLog.findMany({
      where: { tenantId, createdAt: { gte: todayStart, lte: todayEnd } },
      include: { user: { select: { id: true, name: true, avatarColor: true } } },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.target.findFirst({
      where: {
        tenantId,
        userId: user.id,
        month: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`,
      },
    }),
    prisma.user.findMany({
      where: { tenantId, isActive: true, role: { in: ["ADMIN", "MANAGER", "EMPLOYEE"] } },
      select: { id: true, name: true, avatarColor: true },
    }),
  ]);

  // Sort leads: HOT first
  const tempOrder: Record<string, number> = { HOT: 0, WARM: 1, COLD: 2 };
  const sortedLeads = [...leads].sort(
    (a, b) => (tempOrder[a.temperature] ?? 2) - (tempOrder[b.temperature] ?? 2)
  );

  const serialisedLogs = callLogs.map((c) => ({
    id: c.id,
    userId: c.userId,
    leadName: c.leadName,
    phone: c.phone,
    direction: c.direction,
    disposition: c.disposition,
    durationSec: c.durationSec,
    recordingUrl: c.recordingUrl,
    notes: c.notes,
    createdAt: c.createdAt.toISOString(),
    user: c.user
      ? { id: c.user.id, name: c.user.name, avatarColor: c.user.avatarColor }
      : null,
  }));

  return (
    <CallingClient
      leads={sortedLeads.map((l) => ({
        ...l,
        nextFollowUp: l.nextFollowUp ? l.nextFollowUp.toISOString() : null,
      }))}
      callLogs={serialisedLogs}
      dailyTarget={target ? Number(target.targetValue) : 50}
      teamMembers={teamMembers}
      currentUser={{ id: user.id, name: user.name, role: user.role }}
      tenantId={tenantId}
    />
  );
}
