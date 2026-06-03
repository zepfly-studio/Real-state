import { Role } from "@prisma/client";
import { prisma } from "./prisma";
import { MODULES, type ModuleDef } from "./modules";

/**
 * Returns the modules visible to a role within a tenant.
 * Default visibility comes from each module's `roles`; a tenant's
 * ModulePermission rows can further toggle a module off (canView=false).
 */
export async function visibleModules(
  role: Role,
  tenantId: string | null
): Promise<ModuleDef[]> {
  const base = MODULES.filter((m) => m.roles.includes(role));

  if (!tenantId) return base;

  const perms = await prisma.modulePermission
    .findMany({ where: { tenantId, role } })
    .catch(() => []);

  if (perms.length === 0) return base;

  const denied = new Set(
    perms.filter((p) => p.canView === false).map((p) => p.moduleKey)
  );
  return base.filter((m) => !denied.has(m.key));
}

export async function canViewModule(
  role: Role,
  tenantId: string | null,
  moduleKey: string
): Promise<boolean> {
  const mods = await visibleModules(role, tenantId);
  return mods.some((m) => m.key === moduleKey);
}
