import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentUser, resolveTenantId } from "@/lib/session";
import { audit } from "@/lib/audit";

// Save / connect an integration key (DB per-tenant). Empty value disconnects.
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user || !["SUPER_ADMIN", "ADMIN"].includes(user.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const tenantId = await resolveTenantId(user);
  if (!tenantId) return NextResponse.json({ error: "No tenant" }, { status: 400 });

  const { name, value } = await req.json();
  if (!name) return NextResponse.json({ error: "Missing name" }, { status: 400 });

  const trimmed = (value ?? "").trim();
  const isActive = trimmed.length > 0;

  await prisma.integration.upsert({
    where: { tenantId_name: { tenantId, name } },
    update: { value: trimmed || null, isActive },
    create: { tenantId, name, value: trimmed || null, isActive },
  });

  await audit({
    tenantId,
    action: isActive ? "INTEGRATION_CONNECTED" : "INTEGRATION_DISCONNECTED",
    entity: "Integration",
    entityId: name,
    performedById: user.id,
    meta: { name },
  });

  return NextResponse.json({ ok: true, connected: isActive });
}
