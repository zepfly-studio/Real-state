import { requireUser, resolveTenantId } from "@/lib/session";
import { getIntegration } from "@/lib/integrations";
import { SeoClient } from "./client";

export default async function SeoPage() {
  const user = await requireUser();
  const tenantId = await resolveTenantId(user);

  if (!tenantId) {
    return <div className="text-txt-dim p-8">No tenant context.</div>;
  }

  const anthropicKey = await getIntegration(tenantId, "ANTHROPIC");

  return <SeoClient hasBlogWriter={!!anthropicKey} tenantId={tenantId} />;
}
