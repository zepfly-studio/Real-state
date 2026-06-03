import { requireUser, resolveTenantId } from "@/lib/session";
import { getIntegration } from "@/lib/integrations";
import { LeadGeniusClient } from "./client";

export default async function LeadGeniusPage() {
  const user = await requireUser();
  const tenantId = await resolveTenantId(user);

  if (!tenantId) {
    return <div className="text-txt-dim p-8">No tenant context.</div>;
  }

  const [apolloKey, hunterKey, clearbitKey] = await Promise.all([
    getIntegration(tenantId, "APOLLO"),
    getIntegration(tenantId, "HUNTER"),
    getIntegration(tenantId, "CLEARBIT"),
  ]);

  const isDemo = !apolloKey && !hunterKey && !clearbitKey;

  return <LeadGeniusClient isDemo={isDemo} tenantId={tenantId} />;
}
