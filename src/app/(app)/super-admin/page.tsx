import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PageHeader, KPICard, Card } from "@/components/ui";
import { inr } from "@/lib/format";
import { SuperAdminClient } from "./client";

export default async function SuperAdminPage() {
  await requireRole(["SUPER_ADMIN"]);

  const tenants = await prisma.tenant.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { users: true, leads: true, bookings: true } },
    },
  });

  const tenantData = await Promise.all(
    tenants.map(async (t) => {
      const bookings = await prisma.booking.findMany({ where: { tenantId: t.id } });
      const revenue = bookings.reduce((s, b) => s + Number(b.amount), 0);
      return {
        id: t.id,
        name: t.name,
        subdomain: t.subdomain,
        plan: t.plan,
        isActive: t.isActive,
        brandPrimary: t.brandPrimary,
        users: t._count.users,
        leads: t._count.leads,
        bookings: t._count.bookings,
        revenue,
      };
    })
  );

  const totalRevenue = tenantData.reduce((s, t) => s + t.revenue, 0);
  const totalUsers = tenantData.reduce((s, t) => s + t.users, 0);
  const activeClients = tenantData.filter((t) => t.isActive).length;

  const PLAN_PRICE: Record<string, number> = { STARTER: 4999, GROWTH: 14999, ENTERPRISE: 49999 };
  const mrr = tenantData.reduce((s, t) => s + (PLAN_PRICE[t.plan] ?? 0), 0);

  return (
    <div>
      <PageHeader
        title="Super Admin Console"
        subtitle="Creative Sharks — cross-tenant control center"
        icon="ServerCog"
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPICard label="Active Clients" value={String(activeClients)} icon="Building2" accent="gold" />
        <KPICard label="Total Users" value={String(totalUsers)} icon="Users" accent="blue" />
        <KPICard label="Platform MRR" value={inr(mrr)} delta="+9.2%" icon="IndianRupee" accent="green" />
        <KPICard label="GMV (bookings)" value={inr(totalRevenue)} icon="TrendingUp" accent="purple" />
      </div>

      <SuperAdminClient tenants={tenantData} planPrice={PLAN_PRICE} />
    </div>
  );
}
