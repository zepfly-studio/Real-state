import { NextRequest, NextResponse } from "next/server";
import { currentUser, resolveTenantId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getIntegration } from "@/lib/integrations";

/**
 * GET /api/email-digest
 * Returns a summary of real tenant DB data (overdue follow-ups, pending approvals,
 * new leads). When GMAIL key is present, notes that the real inbox can also be pulled.
 * Never throws — always returns JSON.
 */
export async function GET(_req: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await resolveTenantId(user);
    if (!tenantId) {
      return NextResponse.json({ error: "No tenant" }, { status: 400 });
    }

    const gmailKey = await getIntegration(tenantId, "GMAIL");

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const cutoff48h = new Date(now.getTime() - 48 * 60 * 60 * 1000);

    const [overdueCount, pendingApprovals, newLeads48h] = await Promise.all([
      prisma.lead
        .count({
          where: {
            tenantId,
            nextFollowUp: { lt: todayStart },
            stage: { notIn: ["CLOSED_WON", "CLOSED_LOST"] },
          },
        })
        .catch(() => 0),
      prisma.approval
        .count({ where: { tenantId, status: "PENDING" } })
        .catch(() => 0),
      prisma.lead
        .count({
          where: { tenantId, createdAt: { gte: cutoff48h } },
        })
        .catch(() => 0),
    ]);

    return NextResponse.json({
      source: "db",
      summary: {
        overdueFollowUps: overdueCount,
        pendingApprovals,
        newLeads48h,
      },
      gmail: gmailKey
        ? { connected: true, message: "Gmail key detected — implement fetchGmailInbox() to also pull inbox." }
        : { connected: false, message: "Connect Gmail in Settings → Integrations to also pull your inbox." },
    });
  } catch (err) {
    console.error("[email-digest]", err);
    return NextResponse.json(
      { source: "error", message: "Failed to load digest summary." },
      { status: 200 }
    );
  }
}
