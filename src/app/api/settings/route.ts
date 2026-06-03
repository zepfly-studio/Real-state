import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentUser, resolveTenantId } from "@/lib/session";
import { audit } from "@/lib/audit";

// Update tenant branding / company details and/or notification + misc settings.
export async function PATCH(req: Request) {
  const user = await currentUser();
  if (!user || !["SUPER_ADMIN", "ADMIN"].includes(user.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const tenantId = await resolveTenantId(user);
  if (!tenantId) return NextResponse.json({ error: "No tenant" }, { status: 400 });

  const body = await req.json();
  const { tenant, settings, plan, featureLimits } = body as {
    tenant?: Record<string, string>;
    settings?: Record<string, string>;
    plan?: string;
    featureLimits?: Record<string, unknown>;
  };

  if (tenant) {
    const allowed = ["name", "logoUrl", "faviconUrl", "brandPrimary", "brandAccent", "domain", "subdomain", "reraNo", "gstNo", "address"];
    const data: Record<string, string> = {};
    for (const k of allowed) if (tenant[k] !== undefined) data[k] = tenant[k];
    if (Object.keys(data).length) {
      try {
        await prisma.tenant.update({ where: { id: tenantId }, data });
      } catch (e: any) {
        if (e?.code === "P2002") return NextResponse.json({ error: "Subdomain already taken." }, { status: 409 });
        throw e;
      }
    }
  }

  if (plan) await prisma.tenant.update({ where: { id: tenantId }, data: { plan } });
  if (featureLimits) await prisma.tenant.update({ where: { id: tenantId }, data: { featureLimits: featureLimits as any } });

  if (settings) {
    for (const [key, value] of Object.entries(settings)) {
      await prisma.setting.upsert({
        where: { tenantId_key: { tenantId, key } },
        update: { value: String(value) },
        create: { tenantId, key, value: String(value) },
      });
    }
  }

  await audit({ tenantId, action: "SETTINGS_UPDATED", entity: "Tenant", entityId: tenantId, performedById: user.id });
  return NextResponse.json({ ok: true });
}
