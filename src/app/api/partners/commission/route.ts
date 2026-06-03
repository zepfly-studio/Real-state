import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentUser, resolveTenantId } from "@/lib/session";
import { audit } from "@/lib/audit";

/**
 * POST /api/partners/commission
 * Body: { partnerId, leadName, dealValue, rate? }
 * Computes amount = dealValue * rate / 100, creates a CommissionLedger row,
 * and increments Partner.totalDeals + totalValue.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const tenantId = await resolveTenantId(user);
    if (!tenantId) return NextResponse.json({ error: "No tenant" }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const { partnerId, leadName, dealValue, rate } = body as {
      partnerId?: string;
      leadName?: string;
      dealValue?: number;
      rate?: number;
    };

    if (!partnerId) return NextResponse.json({ error: "partnerId is required" }, { status: 400 });
    if (!leadName?.trim()) return NextResponse.json({ error: "leadName is required" }, { status: 400 });
    if (!dealValue || dealValue <= 0) return NextResponse.json({ error: "dealValue must be > 0" }, { status: 400 });

    // Verify partner belongs to this tenant
    const partner = await prisma.partner.findFirst({ where: { id: partnerId, tenantId } });
    if (!partner) return NextResponse.json({ error: "Partner not found" }, { status: 404 });

    const commissionRate = typeof rate === "number" && rate >= 0 ? rate : 2;
    const amount = (dealValue * commissionRate) / 100;

    // Create commission + update partner totals in a transaction
    const [commission] = await prisma.$transaction([
      prisma.commissionLedger.create({
        data: {
          tenantId,
          partnerId,
          leadName: leadName.trim(),
          dealValue,
          rate: commissionRate,
          amount,
        },
      }),
      prisma.partner.update({
        where: { id: partnerId },
        data: {
          totalDeals: { increment: 1 },
          totalValue: { increment: dealValue },
        },
      }),
    ]);

    await audit({
      tenantId,
      action: "CREATE",
      entity: "CommissionLedger",
      entityId: commission.id,
      performedById: user.id,
      meta: { partnerId, leadName, dealValue, rate: commissionRate, amount },
    });

    return NextResponse.json(commission, { status: 201 });
  } catch (err) {
    console.error("[partners/commission POST]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
