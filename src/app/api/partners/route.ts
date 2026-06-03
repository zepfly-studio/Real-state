import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentUser, resolveTenantId } from "@/lib/session";
import { audit } from "@/lib/audit";

/**
 * GET /api/partners
 * Returns all partners for the current tenant.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const tenantId = await resolveTenantId(user);
    if (!tenantId) return NextResponse.json({ error: "No tenant" }, { status: 400 });

    const partners = await prisma.partner.findMany({
      where: { tenantId },
      include: { commissions: true },
      orderBy: { totalValue: "desc" },
    });
    return NextResponse.json(partners);
  } catch (err) {
    console.error("[partners GET]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/**
 * POST /api/partners
 * Body: { name, firm?, phone, email?, rera? }
 * Creates a new channel partner.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const tenantId = await resolveTenantId(user);
    if (!tenantId) return NextResponse.json({ error: "No tenant" }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const { name, firm, phone, email, rera } = body as {
      name?: string;
      firm?: string;
      phone?: string;
      email?: string;
      rera?: string;
    };

    if (!name?.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    if (!phone?.trim()) {
      return NextResponse.json({ error: "Phone is required" }, { status: 400 });
    }

    const partner = await prisma.partner.create({
      data: {
        tenantId,
        name: name.trim(),
        firm: firm?.trim() || null,
        phone: phone.trim(),
        email: email?.trim() || null,
        rera: rera?.trim() || null,
      },
    });

    await audit({
      tenantId,
      action: "CREATE",
      entity: "Partner",
      entityId: partner.id,
      performedById: user.id,
      meta: { name, firm, phone, email, rera },
    });

    return NextResponse.json(partner, { status: 201 });
  } catch (err) {
    console.error("[partners POST]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
