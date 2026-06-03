import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentUser, resolveTenantId } from "@/lib/session";
import { audit } from "@/lib/audit";

// Upsert a monthly sales target for a user.
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user || !["SUPER_ADMIN", "ADMIN", "MANAGER"].includes(user.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const tenantId = await resolveTenantId(user);
  if (!tenantId) return NextResponse.json({ error: "No tenant" }, { status: 400 });

  const { userId, month, targetValue } = await req.json();
  if (!userId || !month) return NextResponse.json({ error: "userId and month required" }, { status: 400 });

  // ensure user belongs to tenant
  const target = await prisma.user.findFirst({ where: { id: userId, tenantId } });
  if (!target) return NextResponse.json({ error: "User not in tenant" }, { status: 404 });

  await prisma.target.upsert({
    where: { tenantId_userId_month: { tenantId, userId, month } },
    update: { targetValue: Number(targetValue) || 0 },
    create: { tenantId, userId, month, targetValue: Number(targetValue) || 0 },
  });

  await audit({ tenantId, action: "TARGET_SET", entity: "Target", performedById: user.id, meta: { userId, month, targetValue } });
  return NextResponse.json({ ok: true });
}
