import { requireUser, resolveTenantId } from "@/lib/session";
import { getIntegration } from "@/lib/integrations";
import { EmailDigestClient } from "./client";

export default async function EmailDigestPage() {
  const user = await requireUser();
  const tenantId = await resolveTenantId(user);

  if (!tenantId) {
    return <div className="text-txt-dim p-8">No tenant context.</div>;
  }

  const gmailKey = await getIntegration(tenantId, "GMAIL");

  return (
    <EmailDigestClient
      hasKey={!!gmailKey}
      tenantId={tenantId}
      userName={user.name}
    />
  );
}
