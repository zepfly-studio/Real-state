import { requireRole, resolveTenantId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { CompetitorClient } from "./client";

export default async function CompetitorPage() {
  const user = await requireRole(["SUPER_ADMIN", "ADMIN", "MANAGER"]);
  const tenantId = await resolveTenantId(user);

  if (!tenantId) {
    return <div className="text-txt-dim p-6">No tenant context.</div>;
  }

  const [competitors, properties] = await Promise.all([
    prisma.competitor.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.property.findMany({
      where: { tenantId },
      select: { pricePerSqft: true },
    }),
  ]);

  // Compute tenant's average price per sqft
  const avgPricePerSqft =
    properties.length > 0
      ? properties.reduce((s, p) => s + Number(p.pricePerSqft), 0) /
        properties.length
      : 0;

  const serialized = competitors.map((c) => ({
    id: c.id,
    name: c.name,
    project: c.project,
    location: c.location ?? "",
    pricePerSqft: Number(c.pricePerSqft),
    amenities: c.amenities as string[],
    possession: c.possession ?? "",
    createdAt: c.createdAt.toISOString(),
  }));

  return (
    <CompetitorClient
      competitors={serialized}
      tenantAvgPrice={Math.round(avgPricePerSqft)}
    />
  );
}
