import { NextResponse } from "next/server";
import { lgContext, isResponse } from "@/lib/leadgen/guard";
import { guarded, bad } from "@/lib/leadgen/respond";
import { clearCache, inboxQuery, normalizeHistory, sl, SmartleadError } from "@/lib/leadgen/smartlead";

/** POST { campaign_id, to_email, body, email_stats_id?, reply_message_id? } — reply to an email thread. */
export async function POST(req: Request) {
  const ctx = await lgContext();
  if (isResponse(ctx)) return ctx;
  return guarded(async () => {
    const b = await req.json().catch(() => ({}));
    const campaignId = Number(b.campaign_id);
    const text = String(b.body ?? "").trim();
    const toEmail = String(b.to_email ?? "").trim();
    if (!Number.isInteger(campaignId) || campaignId <= 0 || !text) return bad("A campaign and a message are required.");
    if (text.length > 8000) return bad("That message is too long.");

    let statsId: string | undefined = b.email_stats_id ? String(b.email_stats_id) : undefined;
    let messageId: string | undefined = b.reply_message_id ? String(b.reply_message_id) : undefined;

    if (!statsId && toEmail) {
      // Derive the thread ids from the most recent message in the conversation.
      const data = await inboxQuery(
        ctx.tenantId,
        { offset: 0, limit: 5, sortBy: "REPLY_TIME_DESC", filters: { search: toEmail.slice(0, 30), campaignId: [campaignId] } },
        true
      );
      for (const m of data?.messages ?? []) {
        if (String(m?.lead?.email ?? "").toLowerCase() === toEmail.toLowerCase()) {
          const hist = normalizeHistory(m);
          const last = hist[hist.length - 1];
          statsId = (last?.stats_id as string | undefined) ?? m?.last_message?.id;
          messageId = messageId ?? (last?.message_id as string | undefined);
          break;
        }
      }
    }
    if (!statsId) throw new SmartleadError(422, "Couldn't work out which email to reply to. Reply from Smartlead's inbox this once.");

    const payload: Record<string, unknown> = { email_stats_id: String(statsId), email_body: text.replace(/\n/g, "<br>"), add_signature: true };
    if (messageId) payload.reply_message_id = messageId;
    if (toEmail) payload.to_email = toEmail;
    await sl(ctx.tenantId, "POST", `/campaigns/${campaignId}/reply-email-thread`, { json: payload });
    clearCache(ctx.tenantId);
    return NextResponse.json({ ok: true });
  });
}
