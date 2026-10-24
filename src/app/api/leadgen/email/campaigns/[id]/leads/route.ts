import { NextResponse } from "next/server";
import { lgContext, isResponse } from "@/lib/leadgen/guard";
import { guarded, bad } from "@/lib/leadgen/respond";
import { clearCache, EMAIL_RE, normalizeLead, sl, toInt } from "@/lib/leadgen/smartlead";

const STATUSES = ["STARTED", "INPROGRESS", "COMPLETED", "PAUSED", "STOPPED"];
const EMAIL_STATUSES = ["is_opened", "is_clicked", "is_replied", "is_bounced", "is_unsubscribed", "not_replied"];

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const ctx = await lgContext();
  if (isResponse(ctx)) return ctx;
  return guarded(async () => {
    const q = new URL(req.url).searchParams;
    const offset = Math.max(0, toInt(q.get("offset")));
    const limit = Math.min(100, Math.max(1, toInt(q.get("limit")) || 50));
    const query: Record<string, string | number> = { offset, limit };
    if (STATUSES.includes(q.get("status") ?? "")) query.status = q.get("status")!;
    if (EMAIL_STATUSES.includes(q.get("email_status") ?? "")) query.emailStatus = q.get("email_status")!;
    const data = await sl(ctx.tenantId, "GET", `/campaigns/${Number(params.id)}/leads`, { params: query });
    return { total: toInt(data?.total_leads), offset, limit, leads: (data?.data ?? []).map(normalizeLead) };
  });
}

/** POST { leads: [{ email, first_name?, last_name?, phone_number?, company_name?, website?, location? }] } — max 400 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const ctx = await lgContext();
  if (isResponse(ctx)) return ctx;
  return guarded(async () => {
    const { leads } = await req.json().catch(() => ({}));
    if (!Array.isArray(leads) || leads.length === 0) return bad("Add at least one lead.");
    if (leads.length > 400) return bad("Smartlead accepts at most 400 leads at a time. Split the list.");
    const invalid = leads.filter((l: any) => !EMAIL_RE.test(String(l?.email ?? "").trim())).map((l: any) => String(l?.email ?? ""));
    if (invalid.length) return bad(`These aren't valid email addresses: ${invalid.slice(0, 5).join(", ")}${invalid.length > 5 ? " …" : ""}`);

    const FIELDS = ["email", "first_name", "last_name", "phone_number", "company_name", "website", "location"];
    const lead_list = leads.map((l: any) => {
      const o: Record<string, string> = {};
      for (const f of FIELDS) if (typeof l?.[f] === "string" && l[f].trim()) o[f] = l[f].trim();
      return o;
    });
    const data = await sl(ctx.tenantId, "POST", `/campaigns/${Number(params.id)}/leads`, { json: { lead_list }, timeoutMs: 60_000 });
    clearCache(ctx.tenantId);
    const d = data && typeof data === "object" ? data : {};
    return NextResponse.json({
      added: toInt(d.added_count ?? d.upload_count),
      skipped: toInt(d.skipped_count ?? d.duplicate_count),
      skipped_leads: (d.skipped_leads ?? []).slice(0, 20),
      submitted: leads.length,
    });
  });
}
