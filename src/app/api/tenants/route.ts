import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/session";
import { audit } from "@/lib/audit";
import { MODULES } from "@/lib/modules";
import { INTEGRATIONS } from "@/lib/integrations";
import { Role } from "@prisma/client";

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user || user.role !== "SUPER_ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { name, subdomain, reraNo, address, brandPrimary, plan, adminName, adminEmail } = body;

  if (!name || !subdomain || !adminEmail)
    return NextResponse.json({ error: "Name, subdomain and admin email are required." }, { status: 400 });

  const existing = await prisma.tenant.findUnique({ where: { subdomain } });
  if (existing) return NextResponse.json({ error: "Subdomain already taken." }, { status: 409 });

  const emailTaken = await prisma.user.findUnique({ where: { email: adminEmail.toLowerCase() } });
  if (emailTaken) return NextResponse.json({ error: "Admin email already in use." }, { status: 409 });

  const tenant = await prisma.tenant.create({
    data: {
      name,
      subdomain,
      reraNo: reraNo || null,
      address: address || null,
      brandPrimary: brandPrimary || "#d9a441",
      plan: plan || "GROWTH",
    },
  });

  const pass = await bcrypt.hash("password123", 10);
  await prisma.user.create({
    data: {
      tenantId: tenant.id,
      name: adminName || "Admin",
      email: adminEmail.toLowerCase(),
      passwordHash: pass,
      role: Role.ADMIN,
      avatarColor: brandPrimary || "#d9a441",
    },
  });

  // Default module permissions + integration rows for the new tenant
  const roles: Role[] = ["SUPER_ADMIN", "ADMIN", "MANAGER", "EMPLOYEE", "CLIENT", "CHANNEL_PARTNER"];
  await prisma.modulePermission.createMany({
    data: roles.flatMap((role) =>
      MODULES.map((m) => ({
        tenantId: tenant.id,
        role,
        moduleKey: m.key,
        canView: m.roles.includes(role),
        canEdit: m.roles.includes(role) && ["SUPER_ADMIN", "ADMIN", "MANAGER"].includes(role),
      }))
    ),
  });
  await prisma.integration.createMany({
    data: INTEGRATIONS.map((i) => ({ tenantId: tenant.id, name: i.name, isActive: false })),
  });

  await audit({ tenantId: tenant.id, action: "TENANT_CREATED", entity: "Tenant", entityId: tenant.id, performedById: user.id, meta: { name } });

  return NextResponse.json({ ok: true, tenantId: tenant.id });
}

export async function PATCH(req: Request) {
  const user = await currentUser();
  if (!user || user.role !== "SUPER_ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id, isActive } = await req.json();
  await prisma.tenant.update({ where: { id }, data: { isActive } });
  await audit({ tenantId: id, action: isActive ? "TENANT_ACTIVATED" : "TENANT_SUSPENDED", entity: "Tenant", entityId: id, performedById: user.id });
  return NextResponse.json({ ok: true });
}
