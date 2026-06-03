import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentUser, resolveTenantId } from "@/lib/session";
import { audit } from "@/lib/audit";
import { MODULES } from "@/lib/modules";
import { Role } from "@prisma/client";

const TOGGLE_ROLES: Role[] = ["ADMIN", "MANAGER", "EMPLOYEE", "CLIENT", "CHANNEL_PARTNER"];

// Enable/disable a module for the whole tenant (affects every role's sidebar + guards).
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user || !["SUPER_ADMIN", "ADMIN"].includes(user.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const tenantId = await resolveTenantId(user);
  if (!tenantId) return NextResponse.json({ error: "No tenant" }, { status: 400 });

  const { moduleKey, enabled } = await req.json();
  const mod = MODULES.find((m) => m.key === moduleKey);
  if (!mod) return NextResponse.json({ error: "Unknown module" }, { status: 400 });

  for (const role of TOGGLE_ROLES) {
    // When enabling, restore the module's default visibility for that role.
    const canView = enabled ? mod.roles.includes(role) : false;
    await prisma.modulePermission.upsert({
      where: { tenantId_role_moduleKey: { tenantId, role, moduleKey } },
      update: { canView },
      create: { tenantId, role, moduleKey, canView, canEdit: canView && ["ADMIN", "MANAGER"].includes(role) },
    });
  }

  await audit({ tenantId, action: enabled ? "MODULE_ENABLED" : "MODULE_DISABLED", entity: "Module", entityId: moduleKey, performedById: user.id });
  return NextResponse.json({ ok: true });
}
