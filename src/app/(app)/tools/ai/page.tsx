import { requireUser, resolveTenantId } from "@/lib/session";
import { AiChatClient } from "./client";

export default async function AiPage() {
  const user = await requireUser();
  const tenantId = await resolveTenantId(user);

  return <AiChatClient userName={user.name} tenantId={tenantId ?? ""} />;
}
