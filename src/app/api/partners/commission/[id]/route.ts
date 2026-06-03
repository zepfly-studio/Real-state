import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentUser, resolveTenantId } from "@/lib/session";
import { audit } from "@/lib/audit";
import { CommissionStatus } from "@prisma/client";

/**
 * PATCH /api/partners/commission/[id]
 * Body: { status: "PENDING" | "APPROVED" | "PAID" }
 * Updates the commission status. Tenant-scoped.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const tenantId = await resolveTenantId(user);
    if (!tenantId) return NextResponse.json({ error: "No tenant" }, { status: 400 });

    const { id } = params;
    const body = await req.json().catch(() => ({}));
    const { status } = body as { status?: string };

    const VALID_STATUSES: CommissionStatus[] = ["PENDING", "APPROVED", "PAID"];
    if (!status || !VALID_STATUSES.includes(status as CommissionStatus)) {
      return NextResponse.json(
        { error: `status must be one of: ${VALID_STATUSES.join(", ")}` },
        { status: 400 }
      );
    }

    // Ensure commission belongs to this tenant
    const existing = await prisma.commissionLedger.findFirst({
      where: { id, tenantId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Commission record not found" }, { status: 404 });
    }

    const updated = await prisma.commissionLedger.update({
      where: { id },
      data: { status: status as CommissionStatus },
    });

    await audit({
      tenantId,
      action: "UPDATE_STATUS",
      entity: "CommissionLedger",
      entityId: id,
      performedById: user.id,
      meta: { previousStatus: existing.status, newStatus: status },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("[partners/commission/[id] PATCH]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
