import { lgContext, isResponse } from "@/lib/leadgen/guard";
import { guarded } from "@/lib/leadgen/respond";
import { campaignsWithStats, totals } from "@/lib/leadgen/smartlead";

/** Totals for the Overview. Cheap when the campaigns call was cached. */
export async function GET() {
  const ctx = await lgContext();
  if (isResponse(ctx)) return ctx;
  return guarded(async () => ({ totals: totals(await campaignsWithStats(ctx.tenantId)) }));
}
