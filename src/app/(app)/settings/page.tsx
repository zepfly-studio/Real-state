import { requireRole, resolveTenantId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { INTEGRATIONS, getIntegrationStatuses, maskKey } from "@/lib/integrations";
import { SettingsClient } from "./client";

export default async function SettingsPage() {
  const user = await requireRole(["SUPER_ADMIN", "ADMIN"]);
  const tenantId = await resolveTenantId(user);

  const tenant = tenantId ? await prisma.tenant.findUnique({ where: { id: tenantId } }) : null;
  const statuses = await getIntegrationStatuses(tenantId);
  const intRows = tenantId ? await prisma.integration.findMany({ where: { tenantId } }) : [];
  const settings = tenantId ? await prisma.setting.findMany({ where: { tenantId } }) : [];
  const users = tenantId
    ? await prisma.user.findMany({ where: { tenantId, role: { in: ["ADMIN", "MANAGER", "EMPLOYEE"] } }, orderBy: { name: "asc" } })
    : [];
  const month = "2026-06";
  const targets = tenantId ? await prisma.target.findMany({ where: { tenantId, month } }) : [];

  const integrations = INTEGRATIONS.map((meta) => {
    const row = intRows.find((r) => r.name === meta.name);
    const status = statuses.find((s) => s.name === meta.name)!;
    return {
      ...meta,
      connected: status.connected,
      source: status.source,
      masked: maskKey(row?.value),
    };
  });

  const settingsMap: Record<string, string> = {};
  settings.forEach((s) => (settingsMap[s.key] = s.value));

  return (
    <SettingsClient
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
      }}
      integrations={integrations}
      settings={settingsMap}
      users={users.map((u) => ({ id: u.id, name: u.name, color: u.avatarColor }))}
      targets={targets.map((t) => ({ userId: t.userId, value: Number(t.targetValue) }))}
      month={month}
    />
  );
}
