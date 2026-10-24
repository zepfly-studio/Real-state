import { NextResponse } from "next/server";
import { lgContext, isResponse } from "@/lib/leadgen/guard";
import { guarded, bad } from "@/lib/leadgen/respond";
import { sendText, WhatsAppError } from "@/lib/leadgen/evolution";
import { findLead, logEvent, logMessage } from "@/lib/leadgen/db";

/** POST /api/leadgen/messages/send  { phone, text } — a person replies on WhatsApp from the dashboard. */
export async function POST(req: Request) {
  const ctx = await lgContext();
  if (isResponse(ctx)) return ctx;
  return guarded(async () => {
    const body = await req.json().catch(() => ({}));
    const phone = String(body.phone ?? "").trim();
    const text = String(body.text ?? "").trim();
    if (phone.length < 6 || !text) return bad("A phone number and a message are required.");
    if (text.length > 4000) return bad("That message is too long.");

    const lead = await findLead(ctx.tenantId, { phone });
    try {
      await sendText(ctx.tenantId, phone, text);
    } catch (e) {
      if (e instanceof WhatsAppError) {
        await logEvent(ctx.tenantId, "send_failed", `WhatsApp message to ${phone} not delivered: ${e.detail}`, { campaignId: lead?.campaignId, leadId: lead?.id });
      }
      throw e;
    }
    // Only a confirmed delivery becomes a chat message.
    await logMessage(ctx.tenantId, phone, "OUTBOUND", text, lead);
    return NextResponse.json({ ok: true, linkedLead: Boolean(lead) });
  });
}
