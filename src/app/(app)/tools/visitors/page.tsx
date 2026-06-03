import { requireUser, resolveTenantId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { VisitorClient } from "./client";

export default async function VisitorPage() {
  const user = await requireUser();
  const tenantId = await resolveTenantId(user);

  if (!tenantId) {
    return <div className="text-txt-dim p-6">No tenant context.</div>;
  }

  const visitors = await prisma.visitor.findMany({
    where: { tenantId },
    orderBy: { checkIn: "desc" },
  });

  const serialized = visitors.map((v) => ({
    id: v.id,
    name: v.name,
    phone: v.phone,
    purpose: v.purpose,
    qrCode: v.qrCode,
    checkIn: v.checkIn.toISOString(),
    checkOut: v.checkOut ? v.checkOut.toISOString() : null,
  }));

  return <VisitorClient visitors={serialized} tenantId={tenantId} />;
}
