import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { lgTokenTenant } from "@/lib/leadgen/guard";
import { findLead, logEvent, logMessage } from "@/lib/leadgen/db";
import { LG_STAGES, phoneKey } from "@/lib/leadgen/stages";

/**
 * POST /api/leadgen/sync — the n8n workflow reports what it did.
 * Header:  X-Leadgen-Token: <the workspace token from Lead Generation → Setup>
 * Body:    { event, campaign_id?, lead_id?, phone?, data: {...} }
 * Events:  new_lead · status_change · whatsapp_message · send_failed
 */
export async function POST(req: Request) {
  const tenantId = await lgTokenTenant(req);
  if (!tenantId) return NextResponse.json({ error: "Bad or missing X-Leadgen-Token." }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Send a JSON body." }, { status: 400 });

  const kind = String(body.event ?? "").toLowerCase();
  const d: Record<string, any> = body.data && typeof body.data === "object" ? body.data : {};
  const phoneIn = String(body.phone ?? d.phone ?? "").trim();

  // A campaign id from n8n is only trusted if it belongs to this workspace.
  let campaignId: string | null = null;
  if (body.campaign_id) {
    const c = await prisma.lgCampaign.findFirst({ where: { id: String(body.campaign_id), tenantId }, select: { id: true } });
    campaignId = c?.id ?? null;
  }

  try {
    if (kind === "new_lead") {
      if (!phoneIn) return NextResponse.json({ error: "new_lead requires data.phone" }, { status: 400 });
      // Same person, different formatting (+91…, 0…, spaces) inside one campaign is the same prospect.
      const key = phoneKey(phoneIn);
      const same = key.length >= 7
        ? await prisma.lgLead.findMany({ where: { tenantId, campaignId, phone: { contains: key } }, take: 10 })
        : await prisma.lgLead.findMany({ where: { tenantId, campaignId, phone: phoneIn }, take: 1 });
      const existing = same.find((r) => phoneKey(r.phone) === key) ?? same[0] ?? null;
      const fields = {
        name: d.name ? String(d.name).slice(0, 200) : undefined,
        email: d.email ? String(d.email).slice(0, 200) : undefined,
        address: d.address ? String(d.address).slice(0, 500) : undefined,
      };
      const lead = existing
        ? await prisma.lgLead.update({ where: { id: existing.id }, data: fields })
        : await prisma.lgLead.create({ data: { tenantId, campaignId, phone: phoneIn.slice(0, 50), ...fields } });
      if (!existing) {
        await logEvent(tenantId, "lead_scraped", String(d.name || phoneIn), { campaignId, leadId: lead.id });
        if (campaignId) await prisma.lgCampaign.updateMany({ where: { id: campaignId, tenantId, status: { in: ["PENDING", "SCRAPING"] } }, data: { status: "ACTIVE" } });
      }
      return NextResponse.json({ ok: true, lead_id: lead.id });
    }

    if (kind === "status_change") {
      const status = String(d.status ?? "").toUpperCase();
      if (!(LG_STAGES as readonly string[]).includes(status)) return NextResponse.json({ error: `Unknown status '${status}'` }, { status: 400 });
      const lead = await findLead(tenantId, { id: body.lead_id, phone: phoneIn });
      if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
      await prisma.lgLead.update({ where: { id: lead.id }, data: { status } });
      await logEvent(tenantId, "status_change", `${lead.phone} -> ${status}`, { campaignId: lead.campaignId, leadId: lead.id });
      return NextResponse.json({ ok: true, lead_id: lead.id, status });
    }

    if (kind === "whatsapp_message") {
      const text = String(d.text ?? d.message_text ?? "").trim();
      if (!phoneIn || !text) return NextResponse.json({ error: "whatsapp_message requires phone and text" }, { status: 400 });
      const direction = String(d.direction ?? "INBOUND").toUpperCase() === "OUTBOUND" ? "OUTBOUND" : "INBOUND";
      const lead = await findLead(tenantId, { id: body.lead_id, phone: phoneIn });
      await logMessage(tenantId, phoneIn.slice(0, 50), direction, text.slice(0, 4000), lead);
      return NextResponse.json({ ok: true, linked_lead: Boolean(lead) });
    }

    // A message n8n tried to send that WhatsApp did not accept: logged as an event only,
    // never as a chat message, so the inbox shows conversations that really happened.
    if (kind === "send_failed") {
      const lead = await findLead(tenantId, { id: body.lead_id, phone: phoneIn });
      const channel = String(d.channel ?? "message");
      const reason = String(d.reason ?? "delivery failed").slice(0, 200);
      await logEvent(tenantId, "send_failed", `${channel} to ${phoneIn || "unknown"} not delivered: ${reason}`, { campaignId: lead?.campaignId, leadId: lead?.id });
      return NextResponse.json({ ok: true, linked_lead: Boolean(lead) });
    }

    return NextResponse.json({ error: `Unknown event '${body.event}'` }, { status: 400 });
  } catch (e) {
    console.error("[leadgen/sync]", e);
    return NextResponse.json({ error: "Could not save that event." }, { status: 500 });
  }
}
