import { requireUser, resolveTenantId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { PartnersClient } from "./client";

const MGMT_ROLES: Role[] = ["SUPER_ADMIN", "ADMIN", "MANAGER"];

export default async function PartnersPage() {
  const user = await requireUser();
  const tenantId = await resolveTenantId(user);

  if (!tenantId) {
    return <div className="text-txt-dim p-8">No tenant context.</div>;
  }

  const isChannelPartner = user.role === "CHANNEL_PARTNER";
  const isMgmt = MGMT_ROLES.includes(user.role as Role);

  // Fetch partners: scoped to self if CHANNEL_PARTNER, all if MGMT
  const partners = await prisma.partner.findMany({
    where: isChannelPartner
      ? { tenantId, userId: user.id }
      : { tenantId },
    include: {
      commissions: {
        orderBy: { createdAt: "desc" },
        take: 50,
      },
    },
    orderBy: { totalValue: "desc" },
  });

  // Fetch ALL commission ledger rows for the tenant (for the management view)
  const commissions = isMgmt
    ? await prisma.commissionLedger.findMany({
        where: { tenantId },
        include: { partner: { select: { id: true, name: true, firm: true } } },
        orderBy: { createdAt: "desc" },
        take: 200,
      })
    : [];

  // Serialise Decimals → numbers for client boundary
  const serialisedPartners = partners.map((p) => ({
    ...p,
    totalValue: Number(p.totalValue),
    commissions: p.commissions.map((c) => ({
      ...c,
      dealValue: Number(c.dealValue),
      rate: Number(c.rate),
      amount: Number(c.amount),
      createdAt: c.createdAt.toISOString(),
    })),
    createdAt: p.createdAt.toISOString(),
  }));

  const serialisedCommissions = commissions.map((c) => ({
    ...c,
    dealValue: Number(c.dealValue),
    rate: Number(c.rate),
    amount: Number(c.amount),
    createdAt: c.createdAt.toISOString(),
    partner: c.partner,
  }));

  return (
    <PartnersClient
      partners={serialisedPartners}
      commissions={serialisedCommissions}
      isChannelPartner={isChannelPartner}
      isMgmt={isMgmt}
      tenantId={tenantId}
      userId={user.id}
    />
  );
}
