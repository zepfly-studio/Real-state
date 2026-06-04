import { requireUser, resolveTenantId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getIntegration } from "@/lib/integrations";
import { PriceTrendsClient } from "./client";
import { JAIPUR_AREAS } from "@/lib/format";

export default async function PriceTrendsPage() {
  const user = await requireUser();
  const tenantId = await resolveTenantId(user);

  if (!tenantId) {
    return <div className="text-txt-dim p-6">No tenant context.</div>;
  }

  const trends = await prisma.priceTrend.findMany({
    where: { tenantId },
    orderBy: [{ area: "asc" }, { month: "asc" }],
  });

  // Group by area → array of { month, price }
  const byArea: Record<string, { month: string; price: number }[]> = {};
  for (const t of trends) {
    if (!byArea[t.area]) byArea[t.area] = [];
    byArea[t.area].push({ month: t.month, price: Number(t.pricePerSqft) });
  }

  // Get all unique months sorted
  const allMonths = Array.from(
    new Set(trends.map((t) => t.month))
  ).sort();

  // Build chart data: each row is { month, Area1: price, Area2: price, ... }
  const chartData = allMonths.map((month) => {
    const row: Record<string, string | number> = { month };
    for (const area of JAIPUR_AREAS) {
      const entry = byArea[area]?.find((e) => e.month === month);
      if (entry) row[area] = entry.price;
    }
    return row;
  });

  // Build change table: current vs 6mo ago vs 1yr ago
  const changeTable = JAIPUR_AREAS.map((area) => {
    const series = byArea[area] ?? [];
    if (series.length === 0)
      return { area, current: null, sixMonthAgo: null, oneYearAgo: null };

    const sorted = [...series].sort((a, b) => a.month.localeCompare(b.month));
    const current = sorted[sorted.length - 1].price;

    // 6 months back
    const currentMonthStr = sorted[sorted.length - 1].month;
    const currentDate = new Date(currentMonthStr + "-01");
    const sixMonthDate = new Date(currentDate);
    sixMonthDate.setMonth(sixMonthDate.getMonth() - 6);
    const sixMonthKey = sixMonthDate.toISOString().slice(0, 7);
    const sixMonthEntry = sorted.find((e) => e.month === sixMonthKey);

    const oneYearDate = new Date(currentDate);
    oneYearDate.setFullYear(oneYearDate.getFullYear() - 1);
    const oneYearKey = oneYearDate.toISOString().slice(0, 7);
    const oneYearEntry = sorted.find((e) => e.month === oneYearKey);

    // fallback: use oldest available if exact months not found
    const sixMonthPrice = sixMonthEntry?.price ?? (sorted.length >= 6 ? sorted[sorted.length - 6].price : sorted[0].price);
    const oneYearPrice = oneYearEntry?.price ?? (sorted.length >= 12 ? sorted[0].price : null);

    return {
      area,
      current,
      sixMonthAgo: sixMonthPrice,
      oneYearAgo: oneYearPrice,
    };
  }).filter((r) => r.current !== null);

  const canEdit = ["SUPER_ADMIN", "ADMIN", "MANAGER"].includes(user.role);
  const marketConnected = !!(await getIntegration(tenantId, "MARKET_DATA"));

  return (
    <PriceTrendsClient
      chartData={chartData}
      changeTable={changeTable as any}
      availableAreas={JAIPUR_AREAS.filter((a) => byArea[a]?.length > 0)}
      allAreas={JAIPUR_AREAS}
      canEdit={canEdit}
      marketConnected={marketConnected}
    />
  );
}
