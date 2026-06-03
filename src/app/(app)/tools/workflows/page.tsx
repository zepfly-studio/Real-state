import { requireRole, resolveTenantId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { WorkflowsClient } from "./client";

export default async function WorkflowsPage() {
  const user = await requireRole(["SUPER_ADMIN", "ADMIN", "MANAGER"]);
  const tenantId = await resolveTenantId(user);

  if (!tenantId) {
    return <div className="text-txt-dim p-8">No tenant context.</div>;
  }

  const triggers = await prisma.workflowTrigger.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
  });

  const serialised = triggers.map((t) => ({
    id: t.id,
    name: t.name,
    event: t.event as any,
    actions: t.actions as any,
    isActive: t.isActive,
    runCount: t.runCount,
    createdAt: t.createdAt.toISOString(),
  }));

  return <WorkflowsClient triggers={serialised} tenantId={tenantId} />;
}
