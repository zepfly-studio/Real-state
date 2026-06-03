import { requireUser, resolveTenantId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getIntegration } from "@/lib/integrations";
import { GmbClient } from "./client";

export default async function GmbPage() {
  const user = await requireUser();
  const tenantId = await resolveTenantId(user);

  if (!tenantId) {
    return <div className="text-txt-dim p-8">No tenant context.</div>;
  }

  const [tenant, gmbKey, gmapsKey] = await Promise.all([
    prisma.tenant.findUnique({ where: { id: tenantId }, select: { name: true } }),
    getIntegration(tenantId, "GMB"),
    getIntegration(tenantId, "GMAPS"),
  ]);

  const isLive = !!(gmbKey || gmapsKey);

  return (
    <GmbClient
      businessName={tenant?.name ?? "Shubh Realtors"}
      isLive={isLive}
      tenantId={tenantId}
    />
  );
}
