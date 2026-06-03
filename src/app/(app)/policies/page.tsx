import { requireUser, resolveTenantId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import PoliciesClient from "./client";
import { Role } from "@prisma/client";

const EDIT_ROLES: Role[] = ["SUPER_ADMIN", "ADMIN", "MANAGER"];

export default async function PoliciesPage() {
  const user = await requireUser();
  const tenantId = await resolveTenantId(user);

  if (!tenantId) {
    return <div className="text-txt-dim p-8">No tenant context.</div>;
  }

  const policies = await prisma.policy.findMany({
    where: { tenantId },
    orderBy: [{ category: "asc" }, { updatedAt: "desc" }],
  });

  const canEdit = EDIT_ROLES.includes(user.role as Role);

  // Serialize dates
  const serialized = policies.map((p) => ({
    ...p,
    updatedAt: p.updatedAt.toISOString(),
  }));

  return <PoliciesClient policies={serialized} canEdit={canEdit} />;
}
