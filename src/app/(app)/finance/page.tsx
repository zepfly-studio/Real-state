import { requireUser, resolveTenantId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { KPICard, PageHeader } from "@/components/ui";
import { inr, inrFull } from "@/lib/format";
import { FinanceClient } from "./client";

export default async function FinancePage() {
  const user = await requireUser();
  const tenantId = await resolveTenantId(user);

  if (!tenantId) {
    return <div className="text-txt-dim p-8">No tenant context.</div>;
  }

  const [bookings, properties, leads] = await Promise.all([
    prisma.booking.findMany({
      where: { tenantId },
      include: {
        lead: true,
        property: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.property.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.lead.findMany({
      where: { tenantId },
      select: { id: true, name: true, phone: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  // KPI calculations
  const totalCollected = bookings.reduce((sum, b) => sum + Number(b.amount), 0);
  const unitsSold = properties.filter((p) => p.status === "SOLD").length;
  const unitsAvailable = properties.filter((p) => p.status === "AVAILABLE").length;
  const avgTicket = bookings.length > 0 ? totalCollected / bookings.length : 0;

  // Serialise Decimal fields for the client
  const serialisedBookings = bookings.map((b) => ({
    ...b,
    amount: Number(b.amount),
    schedule: b.schedule as any,
    property: {
      ...b.property,
      pricePerSqft: Number(b.property.pricePerSqft),
      totalPrice: Number(b.property.totalPrice),
      createdAt: b.property.createdAt.toISOString(),
    },
    lead: { ...b.lead, value: Number(b.lead.value), createdAt: b.lead.createdAt.toISOString(), updatedAt: b.lead.updatedAt.toISOString(), nextFollowUp: b.lead.nextFollowUp ? b.lead.nextFollowUp.toISOString() : null },
    createdAt: b.createdAt.toISOString(),
  }));

  const serialisedProperties = properties.map((p) => ({
    ...p,
    pricePerSqft: Number(p.pricePerSqft),
    totalPrice: Number(p.totalPrice),
    createdAt: p.createdAt.toISOString(),
  }));

  return (
    <div>
      <PageHeader
        title="Finance & Booking"
        subtitle="Bookings register, inventory tracker, and financial calculators."
        icon="Wallet"
      />

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPICard
          label="Total Collected"
          value={inr(totalCollected || 0)}
          icon="IndianRupee"
          accent="gold"
        />
        <KPICard
          label="Units Sold"
          value={String(unitsSold)}
          icon="Home"
          accent="green"
        />
        <KPICard
          label="Units Available"
          value={String(unitsAvailable)}
          icon="Building2"
          accent="blue"
        />
        <KPICard
          label="Avg Ticket Size"
          value={avgTicket > 0 ? inr(avgTicket) : "—"}
          icon="TrendingUp"
          accent="purple"
        />
      </div>

      <FinanceClient
        bookings={serialisedBookings}
        properties={serialisedProperties}
        leads={leads}
        userRole={user.role}
      />
    </div>
  );
}
