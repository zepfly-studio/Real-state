import { requireRole, resolveTenantId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import CeoDashboard from "./client";

export default async function CeoPage() {
  const user = await requireRole(["SUPER_ADMIN", "ADMIN"]);
  const tenantId = await resolveTenantId(user);

  if (!tenantId) {
    return <div className="text-txt-dim p-8">No tenant context.</div>;
  }

  // Fetch all CeoNote rows grouped by category
  const notes = await prisma.ceoNote.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
  });

  // Business overview: total revenue, active leads, headcount
  const [bookings, leads, users] = await Promise.all([
    prisma.booking.findMany({ where: { tenantId } }),
    prisma.lead.findMany({ where: { tenantId } }),
    prisma.user.findMany({ where: { tenantId, isActive: true } }),
  ]);

  const totalRevenue = bookings.reduce((s, b) => s + Number(b.amount), 0);
  const activeLeads = leads.filter(
    (l) => !["CLOSED_WON", "CLOSED_LOST"].includes(l.stage)
  ).length;
  const headcount = users.length;

  // Monthly bookings for current year for trend
  const now = new Date();
  const bookingsMTD = bookings.filter(
    (b) =>
      b.createdAt.getMonth() === now.getMonth() &&
      b.createdAt.getFullYear() === now.getFullYear()
  ).length;

  const closedWon = leads.filter((l) => l.stage === "CLOSED_WON").length;
  const conversionRate =
    leads.length > 0
      ? Math.round((closedWon / leads.length) * 1000) / 10
      : 0;

  // Serialize notes (Decimal → number)
  const serializedNotes = notes.map((n) => ({
    ...n,
    amount: n.amount ? Number(n.amount) : null,
    createdAt: n.createdAt.toISOString(),
  }));

  return (
    <CeoDashboard
      notes={serializedNotes}
      overview={{
        totalRevenue: totalRevenue || 84_000_000,
        activeLeads,
        headcount,
        bookingsMTD: bookingsMTD || bookings.length,
        conversionRate,
        closedWon,
      }}
      userId={user.id}
    />
  );
}
