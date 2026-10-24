import { NextResponse } from "next/server";
import { lgContext, isResponse } from "@/lib/leadgen/guard";
import { guarded, bad } from "@/lib/leadgen/respond";
import { clearCache, normalizeSteps, sl } from "@/lib/leadgen/smartlead";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const ctx = await lgContext();
  if (isResponse(ctx)) return ctx;
  return guarded(async () => ({ steps: normalizeSteps(await sl(ctx.tenantId, "GET", `/campaigns/${Number(params.id)}/sequences`)) }));
}

/** PUT { steps: [{ seq_number, subject, body, delay_days }] } — replaces the whole sequence. */
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const ctx = await lgContext();
  if (isResponse(ctx)) return ctx;
  return guarded(async () => {
    const { steps } = await req.json().catch(() => ({}));
    if (!Array.isArray(steps) || steps.length === 0 || steps.length > 10) return bad("Add between 1 and 10 emails.");
    for (const s of steps) {
      if (!String(s?.body ?? "").trim()) return bad("Every email needs a message.");
      const d = Number(s?.delay_days);
      if (!Number.isInteger(d) || d < 0 || d > 60) return bad("Waits must be between 0 and 60 days.");
    }
    const id = Number(params.id);
    // Smartlead replaces the whole sequence on save, so refuse if that could silently drop A/B variants.
    const current = normalizeSteps(await sl(ctx.tenantId, "GET", `/campaigns/${id}/sequences`));
    if (current.some((s) => !s.editable)) return bad("This campaign uses A/B variants. Edit those emails in Smartlead so nothing is lost.");
    await sl(ctx.tenantId, "POST", `/campaigns/${id}/sequences`, {
      json: {
        sequences: steps.map((s: any, i: number) => ({
          seq_number: Number(s.seq_number) || i + 1,
          seq_delay_details: { delay_in_days: Number(s.delay_days) },
          subject: String(s.subject ?? ""),
          email_body: String(s.body),
        })),
      },
    });
    clearCache(ctx.tenantId);
    return NextResponse.json({ ok: true, steps: steps.length });
  });
}
