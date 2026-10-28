import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { lgTokenTenant } from "@/lib/leadgen/guard";
import { findLead, logEvent, logMessage } from "@/lib/leadgen/db";
import { LG_STAGES, phoneKey } from "@/lib/leadgen/stages";
import { cityMatches, isRelevant, normalizePlan, scoreLead } from "@/lib/leadgen/plan";
import { ingestLeads } from "@/lib/leadgen/ingest";

/**
 * POST /api/leadgen/sync — the n8n workflow reports what it did.
 * Header:  X-Leadgen-Token: <the workspace token from Lead Generation → Setup>
 * Body:    { event, campaign_id?, lead_id?, phone?, data: {...} }
 * Events:  new_lead · status_change · whatsapp_message · send_failed · campaign_scraped · campaign_failed
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
    // A whole batch of scraper results at once: filtered, ranked and trimmed to the number asked for, atomically.
    if (kind === "ingest_leads") {
      if (!campaignId) return NextResponse.json({ error: "ingest_leads requires a campaign_id from this workspace" }, { status: 400 });
      const rows = (Array.isArray(d.leads) ? d.leads : []).filter((x: unknown) => x && typeof x === "object").slice(0, 3000);
      const r = await ingestLeads(tenantId, campaignId, rows);
      const outreachOff = d.outreach === false;
      await prisma.lgCampaign.updateMany({ where: { id: campaignId, tenantId, status: { in: ["PENDING", "SCRAPING", "ACTIVE", "COMPLETED"] } }, data: { status: outreachOff || r.kept === 0 ? "COMPLETED" : "ACTIVE" } });
      return NextResponse.json({ ok: true, ...r });
    }

    if (kind === "new_lead") {
      const str = (v: unknown, n: number) => (v == null || String(v).trim() === "" ? undefined : String(v).trim().slice(0, n));
      const email = str(d.email, 200)?.toLowerCase();
      if (!phoneIn && !email) return NextResponse.json({ error: "new_lead requires data.phone or data.email" }, { status: 400 });

      // Apply the approved search plan to every result: excluded titles (assistants, students…) are dropped,
      // decision makers get a higher priority score.
      const campaign = campaignId ? await prisma.lgCampaign.findFirst({ where: { id: campaignId, tenantId }, select: { plan: true, leadTarget: true } }) : null;
      const plan = campaign?.plan ? normalizePlan(campaign.plan as any) : null;
      const score = scoreLead(plan, str(d.title, 200));
      // The scraper filters by state; keep only the requested city when the result says where it is.
      const relevant = isRelevant(plan, str(d.relevance, 2000));
      if (score === null || !cityMatches(plan, str(d.city, 120)) || !relevant) {
        if (campaignId) await prisma.lgCampaign.update({ where: { id: campaignId }, data: { filtered: { increment: 1 } } });
        return NextResponse.json({ ok: true, filtered: true, reason: score === null ? "title excluded by the search plan" : !relevant ? "not the kind of business asked for" : "outside the requested city" });
      }

      // Deliver the number asked for: stop once the campaign has that many prospects (the scraper over-fetches).
      if (campaignId && campaign?.leadTarget) {
        const have = await prisma.lgLead.count({ where: { tenantId, campaignId } });
        if (have >= campaign.leadTarget) return NextResponse.json({ ok: true, skipped: true, reason: "campaign already has the requested number of prospects" });
      }

      // Same person inside one campaign = same prospect: match on phone (any formatting), else on email.
      const key = phoneKey(phoneIn);
      let existing = null;
      if (key.length >= 7) {
        const same = await prisma.lgLead.findMany({ where: { tenantId, campaignId, phone: { contains: key } }, take: 10 });
        existing = same.find((r) => phoneKey(r.phone) === key) ?? null;
      }
      if (!existing && email) existing = await prisma.lgLead.findFirst({ where: { tenantId, campaignId, email } });

      const fields = {
        name: str(d.name, 200),
        email,
        address: str(d.address, 500),
        title: str(d.title, 200),
        company: str(d.company, 200),
        website: str(d.website, 300),
        linkedin: str(d.linkedin, 300),
        city: str(d.city, 120),
        score,
      };
      const lead = existing
        ? await prisma.lgLead.update({ where: { id: existing.id }, data: { ...fields, ...(phoneIn && !existing.phone ? { phone: phoneIn.slice(0, 50) } : {}) } })
        : await prisma.lgLead.create({ data: { tenantId, campaignId, phone: phoneIn ? phoneIn.slice(0, 50) : null, ...fields } });
      if (!existing) {
        await logEvent(tenantId, "lead_scraped", [fields.name || phoneIn || email, fields.title, fields.company].filter(Boolean).join(" · "), { campaignId, leadId: lead.id });
        if (campaignId) await prisma.lgCampaign.updateMany({ where: { id: campaignId, tenantId, status: { in: ["PENDING", "SCRAPING"] } }, data: { status: "ACTIVE" } });
      }
      return NextResponse.json({ ok: true, lead_id: lead.id, score });
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
      await logEvent(tenantId, "send_failed", `${channel} to ${phoneIn || String(d.email ?? "") || "unknown"} not delivered: ${reason}`, { campaignId: lead?.campaignId, leadId: lead?.id });
      return NextResponse.json({ ok: true, linked_lead: Boolean(lead) });
    }

    // The lead search (Apify) finished: say how many sellers were found.
    if (kind === "campaign_scraped") {
      if (!campaignId) return NextResponse.json({ error: "campaign_scraped requires a campaign_id from this workspace" }, { status: 400 });
      const count = Math.max(0, Math.round(Number(d.count) || 0));
      const c = await prisma.lgCampaign.findFirst({ where: { id: campaignId, tenantId } });
      // n8n can report both outcomes for one run; a failed search must stay failed.
      if (c?.status === "FAILED") return NextResponse.json({ ok: true, ignored: "campaign already failed" });
      const outreachOff = d.outreach === false; // nothing is connected to contact them: collecting is the whole job
      await prisma.lgCampaign.update({ where: { id: campaignId }, data: { status: count > 0 && !outreachOff ? "ACTIVE" : "COMPLETED" } });
      await logEvent(tenantId, count > 0 ? "lead_search_done" : "lead_search_empty",
        count > 0 ? `${c?.name}: search returned ${count} result${count === 1 ? "" : "s"} (filtering by the plan)` : `${c?.name}: no results${c?.targetLocation ? ` in ${c.targetLocation}` : ""}`, { campaignId });
      return NextResponse.json({ ok: true, count });
    }

    // The lead search failed (wrong Apify actor, no credit, timeout…): show it instead of "Finding leads" forever.
    if (kind === "campaign_failed") {
      if (!campaignId) return NextResponse.json({ error: "campaign_failed requires a campaign_id from this workspace" }, { status: 400 });
      const rawReason = String(d.reason ?? "unknown error");
      // Provider errors arrive as `404 - "{ \"error\": { \"message\": \"Actor was not found\" } }"` — keep the human part.
      const inner = rawReason.replace(/\\"/g, '"').match(/"message"\s*:\s*"([^"]+)"/)?.[1];
      const code = rawReason.match(/^(\d{3})/)?.[1];
      const reason = (inner ? `${inner}${code ? ` (${code})` : ""}` : rawReason).replace(/\s+/g, " ").slice(0, 200);
      await prisma.lgCampaign.update({ where: { id: campaignId }, data: { status: "FAILED" } });
      await logEvent(tenantId, "lead_search_failed", `Lead search failed: ${reason}`, { campaignId });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: `Unknown event '${body.event}'` }, { status: 400 });
  } catch (e) {
    console.error("[leadgen/sync]", e);
    return NextResponse.json({ error: "Could not save that event." }, { status: 500 });
  }
}
