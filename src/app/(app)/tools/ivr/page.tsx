import { requireRole, resolveTenantId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getIntegration } from "@/lib/integrations";
import { IvrClient } from "./client";

export default async function IvrPage() {
  const user = await requireRole(["SUPER_ADMIN", "ADMIN", "MANAGER"]);
  const tenantId = await resolveTenantId(user);

  if (!tenantId) {
    return <div className="text-txt-dim p-8">No tenant context.</div>;
  }

  const [exotelKey, myoperatorKey, recentCalls] = await Promise.all([
    getIntegration(tenantId, "EXOTEL"),
    getIntegration(tenantId, "MYOPERATOR"),
    prisma.callLog.findMany({
      where: { tenantId },
      include: { user: { select: { id: true, name: true, avatarColor: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  const hasExotel = !!exotelKey;
  const hasMyoperator = !!myoperatorKey;

  const serialisedCalls = recentCalls.map((c) => ({
    id: c.id,
    userId: c.userId,
    leadName: c.leadName,
    phone: c.phone,
    direction: c.direction,
    disposition: c.disposition,
    durationSec: c.durationSec,
    recordingUrl: c.recordingUrl,
    notes: c.notes,
    createdAt: c.createdAt.toISOString(),
    user: c.user
      ? { id: c.user.id, name: c.user.name, avatarColor: c.user.avatarColor }
      : null,
  }));

  return (
    <IvrClient
      hasExotel={hasExotel}
      hasMyoperator={hasMyoperator}
      recentCalls={serialisedCalls}
      tenantId={tenantId}
    />
  );
}
