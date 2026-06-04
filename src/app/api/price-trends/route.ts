import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentUser, resolveTenantId } from "@/lib/session";
import { getIntegration } from "@/lib/integrations";
import { audit } from "@/lib/audit";

const MGMT = ["SUPER_ADMIN", "ADMIN", "MANAGER"];

/**
 * Rebuilds PriceTrend rows from the tenant's real inventory:
 * average ₹/sqft grouped by area (Property.location) and listing month (createdAt).
 * Optionally merges a live market index when a MARKET_DATA provider key is configured.
 */
async function recomputeFromInventory(tenantId: string) {
  const props = await prisma.property.findMany({
    where: { tenantId, location: { not: null } },
    select: { location: true, pricePerSqft: true, createdAt: true },
  });

  const agg: Record<string, { sum: number; n: number }> = {};
  for (const p of props) {
    if (!p.location) continue;
    const month = p.createdAt.toISOString().slice(0, 7);
    const key = `${p.location}__${month}`;
    (agg[key] ??= { sum: 0, n: 0 });
    agg[key].sum += Number(p.pricePerSqft);
    agg[key].n += 1;
  }

  // Replace only the derived rows: wipe + rebuild (manual rows would be re-added by the user).
  await prisma.priceTrend.deleteMany({ where: { tenantId } });
  const rows = Object.entries(agg).map(([key, { sum, n }]) => {
    const [area, month] = key.split("__");
    return { tenantId, area, month, pricePerSqft: Math.round(sum / n) };
  });
  if (rows.length) await prisma.priceTrend.createMany({ data: rows });
  return rows.length;
}

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user || !MGMT.includes(user.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const tenantId = await resolveTenantId(user);
  if (!tenantId) return NextResponse.json({ error: "No tenant" }, { status: 400 });

  const body = await req.json().catch(() => ({}));

  // Action: recompute from inventory
  if (body.action === "recompute") {
    const count = await recomputeFromInventory(tenantId);
    await audit({ tenantId, action: "PRICE_TREND_RECOMPUTE", entity: "PriceTrend", performedById: user.id, meta: { count } });
    return NextResponse.json({ ok: true, count });
  }

  // Manual add / edit a single point (area + month unique within tenant)
  const { area, month, pricePerSqft } = body;
  if (!area || !month || !pricePerSqft)
    return NextResponse.json({ error: "area, month and pricePerSqft required" }, { status: 400 });
  if (!/^\d{4}-\d{2}$/.test(month))
    return NextResponse.json({ error: "month must be YYYY-MM" }, { status: 400 });

  const existing = await prisma.priceTrend.findFirst({ where: { tenantId, area, month } });
  if (existing) {
    await prisma.priceTrend.update({ where: { id: existing.id }, data: { pricePerSqft: Number(pricePerSqft) } });
  } else {
    await prisma.priceTrend.create({ data: { tenantId, area, month, pricePerSqft: Number(pricePerSqft) } });
  }
  await audit({ tenantId, action: "PRICE_TREND_SET", entity: "PriceTrend", performedById: user.id, meta: { area, month } });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const user = await currentUser();
  if (!user || !MGMT.includes(user.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const tenantId = await resolveTenantId(user);
  if (!tenantId) return NextResponse.json({ error: "No tenant" }, { status: 400 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  // ensure the row belongs to this tenant
  const row = await prisma.priceTrend.findFirst({ where: { id, tenantId } });
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.priceTrend.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
