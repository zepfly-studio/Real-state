import { requireUser, resolveTenantId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getIntegration } from "@/lib/integrations";
import { EmailDigestClient } from "./client";

export default async function EmailDigestPage() {
  const user = await requireUser();
  const tenantId = await resolveTenantId(user);

  if (!tenantId) {
    return <div className="text-txt-dim p-8">No tenant context.</div>;
  }

  const gmailKey = await getIntegration(tenantId, "GMAIL");

  // Date thresholds — compute server-side, pass as ISO strings
  const now = new Date();
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrowStart = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

  // Run all queries in parallel — always tenant-scoped, never throw
  const [recentLeads, overdueLeads, todayFollowUps, pendingApprovals, recentActivities] =
    await Promise.all([
      // Recent leads: last 14 days, newest first
      prisma.lead
        .findMany({
          where: {
            tenantId,
            createdAt: { gte: fourteenDaysAgo },
          },
          orderBy: { createdAt: "desc" },
          take: 20,
          select: {
            id: true,
            name: true,
            propertyType: true,
            location: true,
            source: true,
            stage: true,
            temperature: true,
            createdAt: true,
            nextFollowUp: true,
          },
        })
        .catch(() => []),

      // Leads with overdue follow-up (nextFollowUp < today)
      prisma.lead
        .findMany({
          where: {
            tenantId,
            nextFollowUp: { lt: todayStart },
            stage: {
              notIn: ["CLOSED_WON", "CLOSED_LOST"],
            },
          },
          orderBy: { nextFollowUp: "asc" },
          take: 10,
          select: {
            id: true,
            name: true,
            propertyType: true,
            location: true,
            source: true,
            stage: true,
            temperature: true,
            createdAt: true,
            nextFollowUp: true,
          },
        })
        .catch(() => []),

      // Leads with follow-up due today
      prisma.lead
        .findMany({
          where: {
            tenantId,
            nextFollowUp: { gte: todayStart, lt: tomorrowStart },
            stage: {
              notIn: ["CLOSED_WON", "CLOSED_LOST"],
            },
          },
          orderBy: { nextFollowUp: "asc" },
          take: 10,
          select: {
            id: true,
            name: true,
            propertyType: true,
            location: true,
            source: true,
            stage: true,
            temperature: true,
            createdAt: true,
            nextFollowUp: true,
          },
        })
        .catch(() => []),

      // Pending approvals
      prisma.approval
        .findMany({
          where: { tenantId, status: "PENDING" },
          orderBy: { createdAt: "desc" },
          take: 10,
          select: {
            id: true,
            type: true,
            createdAt: true,
            note: true,
            lead: {
              select: { name: true, propertyType: true, location: true },
            },
            requestedBy: {
              select: { name: true },
            },
          },
        })
        .catch(() => []),

      // Recent activities (last 48h)
      prisma.activity
        .findMany({
          where: {
            tenantId,
            createdAt: {
              gte: new Date(now.getTime() - 48 * 60 * 60 * 1000),
            },
          },
          orderBy: { createdAt: "desc" },
          take: 15,
          select: {
            id: true,
            type: true,
            description: true,
            createdAt: true,
            lead: {
              select: { name: true, propertyType: true, location: true },
            },
          },
        })
        .catch(() => []),
    ]);

  // Serialise dates to ISO strings — Prisma Date objects can't cross to client components
  const serialisedData = {
    recentLeads: recentLeads.map((l) => ({
      ...l,
      createdAt: l.createdAt.toISOString(),
      nextFollowUp: l.nextFollowUp?.toISOString() ?? null,
    })),
    overdueLeads: overdueLeads.map((l) => ({
      ...l,
      createdAt: l.createdAt.toISOString(),
      nextFollowUp: l.nextFollowUp?.toISOString() ?? null,
    })),
    todayFollowUps: todayFollowUps.map((l) => ({
      ...l,
      createdAt: l.createdAt.toISOString(),
      nextFollowUp: l.nextFollowUp?.toISOString() ?? null,
    })),
    pendingApprovals: pendingApprovals.map((a) => ({
      ...a,
      createdAt: a.createdAt.toISOString(),
    })),
    recentActivities: recentActivities.map((a) => ({
      ...a,
      createdAt: a.createdAt.toISOString(),
    })),
  };

  return (
    <EmailDigestClient
      hasGmail={!!gmailKey}
      tenantId={tenantId}
      userName={user.name}
      data={serialisedData}
    />
  );
}
