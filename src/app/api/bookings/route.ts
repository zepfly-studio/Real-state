import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentUser, resolveTenantId } from "@/lib/session";
import { audit } from "@/lib/audit";
import { PaymentStatus, PropertyStatus } from "@prisma/client";

/** Default payment schedule milestones based on payment status */
function defaultSchedule(paymentStatus: PaymentStatus, amount: number) {
  if (paymentStatus === "TOKEN") {
    return [
      { milestone: "Token Amount", pct: 2, status: "paid", dueDate: null },
      { milestone: "20% Booking Amount", pct: 18, status: "due", dueDate: "+30 days" },
      { milestone: "40% on Foundation", pct: 40, status: "due", dueDate: "+90 days" },
      { milestone: "20% on Slab", pct: 20, status: "due", dueDate: "+180 days" },
      { milestone: "20% on Possession", pct: 20, status: "due", dueDate: "+365 days" },
    ];
  }
  if (paymentStatus === "PAID_20") {
    return [
      { milestone: "Token Amount", pct: 2, status: "paid", dueDate: null },
      { milestone: "20% Booking Amount", pct: 18, status: "paid", dueDate: null },
      { milestone: "40% on Foundation", pct: 40, status: "due", dueDate: "+60 days" },
      { milestone: "20% on Slab", pct: 20, status: "due", dueDate: "+150 days" },
      { milestone: "20% on Possession", pct: 20, status: "due", dueDate: "+300 days" },
    ];
  }
  // FULL_PAID
  return [
    { milestone: "Token Amount", pct: 2, status: "paid", dueDate: null },
    { milestone: "20% Booking Amount", pct: 18, status: "paid", dueDate: null },
    { milestone: "40% on Foundation", pct: 40, status: "paid", dueDate: null },
    { milestone: "20% on Slab", pct: 20, status: "paid", dueDate: null },
    { milestone: "20% on Possession", pct: 20, status: "paid", dueDate: null },
  ];
}

export async function GET(req: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const tenantId = await resolveTenantId(user);
    if (!tenantId) return NextResponse.json({ error: "No tenant" }, { status: 400 });

    const bookings = await prisma.booking.findMany({
      where: { tenantId },
      include: {
        lead: true,
        property: true,
        bookedBy: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(bookings);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const tenantId = await resolveTenantId(user);
    if (!tenantId) return NextResponse.json({ error: "No tenant" }, { status: 400 });

    const body = await req.json();
    const { leadId, propertyId, amount, paymentStatus } = body;

    if (!leadId || !propertyId || !amount) {
      return NextResponse.json({ error: "Missing required fields: leadId, propertyId, amount" }, { status: 400 });
    }

    // Verify lead and property belong to tenant
    const [lead, property] = await Promise.all([
      prisma.lead.findFirst({ where: { id: leadId, tenantId } }),
      prisma.property.findFirst({ where: { id: propertyId, tenantId } }),
    ]);

    if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    if (!property) return NextResponse.json({ error: "Property not found" }, { status: 404 });

    const status = (paymentStatus as PaymentStatus) || PaymentStatus.TOKEN;
    const schedule = defaultSchedule(status, Number(amount));

    // Create booking + mark property as SOLD in a transaction
    const [booking] = await prisma.$transaction([
      prisma.booking.create({
        data: {
          tenantId,
          leadId,
          propertyId,
          amount: Number(amount),
          paymentStatus: status,
          schedule: schedule as any,
          bookedById: user.id,
        },
        include: { lead: true, property: true },
      }),
      prisma.property.update({
        where: { id: propertyId },
        data: { status: PropertyStatus.SOLD },
      }),
    ]);

    await audit({
      tenantId,
      action: "CREATE",
      entity: "Booking",
      entityId: booking.id,
      performedById: user.id,
      meta: { leadId, propertyId, amount, paymentStatus: status },
    });

    return NextResponse.json(booking, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
