import { lgContext, isResponse } from "@/lib/leadgen/guard";
import { guarded } from "@/lib/leadgen/respond";
import { inboxQuery, normalizeInboxItem, toInt } from "@/lib/leadgen/smartlead";

const STATUSES = ["Replied", "Opened", "Clicked", "Bounced", "Unsubscribed", "Not Replied"];

export async function GET(req: Request) {
  const ctx = await lgContext();
  if (isResponse(ctx)) return ctx;
  return guarded(async () => {
    const q = new URL(req.url).searchParams;
    const filters: Record<string, unknown> = { emailStatus: STATUSES.includes(q.get("status") ?? "") ? q.get("status") : "Replied" };
    if (q.get("campaign_id")) filters.campaignId = [toInt(q.get("campaign_id"))];
    const data = await inboxQuery(
      ctx.tenantId,
      { offset: Math.max(0, toInt(q.get("offset"))), limit: Math.min(20, Math.max(1, toInt(q.get("limit")) || 20)), filters, sortBy: "REPLY_TIME_DESC" },
      false
    );
    return { total: toInt(data?.total_count), items: (data?.messages ?? []).map(normalizeInboxItem) };
  });
}
