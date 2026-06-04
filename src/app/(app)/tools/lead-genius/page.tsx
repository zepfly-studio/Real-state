import { requireUser, resolveTenantId } from "@/lib/session";
import { getIntegration } from "@/lib/integrations";
import { prisma } from "@/lib/prisma";
import { LeadGeniusClient } from "./client";

export default async function LeadGeniusPage() {
  const user = await requireUser();
  const tenantId = await resolveTenantId(user);

  if (!tenantId) {
    return <div className="text-txt-dim p-8">No tenant context.</div>;
  }

  const [apolloKey, hunterKey, clearbitKey, totalLeads] = await Promise.all([
    getIntegration(tenantId, "APOLLO"),
    getIntegration(tenantId, "HUNTER"),
    getIntegration(tenantId, "CLEARBIT"),
    prisma.lead.count({ where: { tenantId } }),
  ]);

  const hasExternalKey = !!(apolloKey || hunterKey || clearbitKey);

  return (
    <LeadGeniusClient
      hasExternalKey={hasExternalKey}
      tenantId={tenantId}
      totalLeads={totalLeads}
    />
  );
}
