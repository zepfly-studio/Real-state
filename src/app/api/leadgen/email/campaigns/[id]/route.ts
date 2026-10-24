import { lgContext, isResponse } from "@/lib/leadgen/guard";
import { guarded, bad } from "@/lib/leadgen/respond";
import { campaignsWithStats } from "@/lib/leadgen/smartlead";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const ctx = await lgContext();
  if (isResponse(ctx)) return ctx;
  return guarded(async () => {
    const id = Number(params.id);
    const found = (await campaignsWithStats(ctx.tenantId)).find((c) => c.id === id);
    return found ?? bad("Campaign not found.", 404);
  });
}
