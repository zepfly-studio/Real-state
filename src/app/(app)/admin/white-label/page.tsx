import { requireRole, resolveTenantId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { MODULES, MODULE_GROUPS } from "@/lib/modules";
import { WhiteLabelClient } from "./client";

export default async function WhiteLabelPage() {
  const user = await requireRole(["SUPER_ADMIN", "ADMIN"]);
  const tenantId = await resolveTenantId(user);
  const tenant = tenantId ? await prisma.tenant.findUnique({ where: { id: tenantId } }) : null;

  // A module is considered "enabled" for the tenant if ADMIN can view it.
  const adminPerms = tenantId
    ? await prisma.modulePermission.findMany({ where: { tenantId, role: "ADMIN" } })
    : [];
  const moduleState = MODULES.map((m) => {
    const perm = adminPerms.find((p) => p.moduleKey === m.key);
    const enabled = perm ? perm.canView : m.roles.includes("ADMIN");
    return { key: m.key, label: m.label, group: m.group, icon: m.icon, enabled, alwaysOn: m.key === "dashboard" || m.key === "settings" || m.key === "white-label" };
  });

  return (
    <WhiteLabelClient
      tenant={{
        name: tenant?.name ?? "",
        logoUrl: tenant?.logoUrl ?? "",
        faviconUrl: tenant?.faviconUrl ?? "",
        brandPrimary: tenant?.brandPrimary ?? "#d9a441",
        brandAccent: tenant?.brandAccent ?? "#f0c14b",
        subdomain: tenant?.subdomain ?? "",
        domain: tenant?.domain ?? "",
        reraNo: tenant?.reraNo ?? "",
        gstNo: tenant?.gstNo ?? "",
        address: tenant?.address ?? "",
        plan: tenant?.plan ?? "GROWTH",
        featureLimits: (tenant?.featureLimits as Record<string, number>) ?? {},
      }}
      modules={moduleState}
      groups={MODULE_GROUPS}
      isSuperAdmin={user.role === "SUPER_ADMIN"}
    />
  );
}
