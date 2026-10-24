import { lgContext, isResponse } from "@/lib/leadgen/guard";
import { guarded, bad } from "@/lib/leadgen/respond";
import { inboxQuery, normalizeHistory, normalizeInboxItem, toInt } from "@/lib/leadgen/smartlead";

/** GET ?campaign_id=&email= — the full email conversation with one lead. */
export async function GET(req: Request) {
  const ctx = await lgContext();
  if (isResponse(ctx)) return ctx;
  return guarded(async () => {
    const q = new URL(req.url).searchParams;
    const email = String(q.get("email") ?? "").slice(0, 60);
    const campaignId = toInt(q.get("campaign_id"));
    if (!email || !campaignId) return bad("campaign_id and email are required.");
    const data = await inboxQuery(
      ctx.tenantId,
      { offset: 0, limit: 5, sortBy: "REPLY_TIME_DESC", filters: { search: email.slice(0, 30), campaignId: [campaignId] } },
      true
    );
    for (const m of data?.messages ?? []) {
      if (String(m?.lead?.email ?? "").toLowerCase() === email.toLowerCase()) {
        return { item: normalizeInboxItem(m), messages: normalizeHistory(m) };
      }
    }
    return bad("Couldn't load that conversation from Smartlead.", 404);
  });
}
