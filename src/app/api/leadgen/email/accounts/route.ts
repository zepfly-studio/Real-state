import { lgContext, isResponse } from "@/lib/leadgen/guard";
import { guarded } from "@/lib/leadgen/respond";
import { clearCache, normalizeAccount, sl } from "@/lib/leadgen/smartlead";

/** GET — sending mailboxes with warm-up health. Passwords are never returned. */
export async function GET(req: Request) {
  const ctx = await lgContext();
  if (isResponse(ctx)) return ctx;
  return guarded(async () => {
    if (new URL(req.url).searchParams.get("refresh") === "1") clearCache(ctx.tenantId);
    const out: ReturnType<typeof normalizeAccount>[] = [];
    for (let page = 0; page < 5; page++) {
      const data = await sl(ctx.tenantId, "GET", "/email-accounts/", { params: { offset: page * 100, limit: 100, fetch_campaigns: "true" } });
      const rows = Array.isArray(data) ? data : [];
      out.push(...rows.map(normalizeAccount));
      if (rows.length < 100) break;
    }
    return {
      accounts: out,
      totals: {
        accounts: out.length,
        healthy: out.filter((a) => a.smtp_ok !== false && a.imap_ok !== false).length,
        warming: out.filter((a) => a.warmup_status === "ACTIVE").length,
        daily_capacity: out.reduce((s, a) => s + a.daily_limit, 0),
        sent_today: out.reduce((s, a) => s + a.sent_today, 0),
      },
    };
  });
}
