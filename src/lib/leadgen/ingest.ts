import { prisma } from "@/lib/prisma";
import { logEvent } from "./db";
import { cityMatches, isRelevant, normalizePlan, scoreLead } from "./plan";
import { phoneKey } from "./stages";

const str = (v: unknown, n: number) => (v == null || String(v).trim() === "" ? undefined : String(v).trim().slice(0, n));

export interface IngestResult {
  received: number;
  kept: number;
  filtered: { title: number; city: number; business: number; duplicate: number; overflow: number };
  /** Best-ranked kept prospects (for the activity feed). */
  top: Array<{ name?: string; title?: string; company?: string; score: number }>;
}

/**
 * One batch of scraper results for a campaign.
 *   1. every row is checked against the approved plan (excluded titles, requested city, kind of business);
 *   2. survivors are ranked — decision makers first, then rows with an email or phone;
 *   3. exactly the best N (what the person asked for, minus what the campaign already has) are saved.
 * Done in one transaction under a per-campaign lock, so parallel batches can never overshoot the number asked for.
 */
export async function ingestLeads(tenantId: string, campaignId: string, rows: Array<Record<string, any>>): Promise<IngestResult> {
  const campaign = await prisma.lgCampaign.findFirst({ where: { id: campaignId, tenantId }, select: { plan: true, leadTarget: true } });
  const plan = campaign?.plan ? normalizePlan(campaign.plan as any) : null;
  const out: IngestResult = { received: rows.length, kept: 0, filtered: { title: 0, city: 0, business: 0, duplicate: 0, overflow: 0 }, top: [] };

  const candidates: Array<{ fields: Record<string, any>; phone?: string; email?: string; score: number }> = [];
  for (const d of rows) {
    const email = str(d.email, 200)?.toLowerCase();
    const phone = str(d.phone, 50);
    if (!email && !phone) continue; // nothing to contact them with
    const score = scoreLead(plan, str(d.title, 200));
    if (score === null) { out.filtered.title++; continue; }
    if (!cityMatches(plan, str(d.city, 120))) { out.filtered.city++; continue; }
    if (!isRelevant(plan, str(d.relevance, 2000))) { out.filtered.business++; continue; }
    candidates.push({
      score: score + (email ? 3 : 0) + (phone ? 5 : 0), // tie-break: reachable people first
      phone, email,
      fields: {
        name: str(d.name, 200), email, address: str(d.address, 500), title: str(d.title, 200), company: str(d.company, 200),
        website: str(d.website, 300), linkedin: str(d.linkedin, 300), city: str(d.city, 120),
      },
    });
  }
  candidates.sort((a, b) => b.score - a.score);

  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${campaignId}))`;
    const existing = await tx.lgLead.findMany({ where: { tenantId, campaignId }, select: { phone: true, email: true } });
    const seenPhone = new Set(existing.map((e) => phoneKey(e.phone)).filter((k) => k.length >= 7));
    const seenEmail = new Set(existing.map((e) => (e.email ?? "").toLowerCase()).filter(Boolean));
    const target = campaign?.leadTarget && campaign.leadTarget > 0 ? campaign.leadTarget : Infinity;
    let room = Math.max(0, target - existing.length);

    for (const c of candidates) {
      const pk = phoneKey(c.phone);
      if ((pk.length >= 7 && seenPhone.has(pk)) || (c.email && seenEmail.has(c.email))) { out.filtered.duplicate++; continue; }
      if (room <= 0) { out.filtered.overflow++; continue; }
      await tx.lgLead.create({ data: { tenantId, campaignId, phone: c.phone ?? null, ...c.fields, score: Math.min(c.score, 100) } });
      if (pk.length >= 7) seenPhone.add(pk);
      if (c.email) seenEmail.add(c.email);
      room--;
      out.kept++;
      if (out.top.length < 5) out.top.push({ name: c.fields.name, title: c.fields.title, company: c.fields.company, score: Math.min(c.score, 100) });
    }
    const dropped = out.filtered.title + out.filtered.city + out.filtered.business + out.filtered.overflow;
    await tx.lgCampaign.update({ where: { id: campaignId }, data: { filtered: { increment: dropped } } });
  });

  await logEvent(
    tenantId,
    "lead_search_done",
    `Kept ${out.kept} of ${out.received} results. Dropped: ${out.filtered.title} excluded titles, ${out.filtered.city} other cities, ${out.filtered.business} other kinds of business, ${out.filtered.overflow} beyond the number asked for.`,
    { campaignId }
  );
  return out;
}
