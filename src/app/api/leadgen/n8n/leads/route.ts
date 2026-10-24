import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { lgTokenTenant } from "@/lib/leadgen/guard";
import { phoneKey } from "@/lib/leadgen/stages";

/**
 * GET /api/leadgen/n8n/leads?status=SCRAPED&campaign_id=…   → leads n8n should work on next
 * GET /api/leadgen/n8n/leads?phone=+9198…                    → { found, lead } (gate for the WhatsApp bot)
 * Header: X-Leadgen-Token
 */
export async function GET(req: Request) {
  const tenantId = await lgTokenTenant(req);
  if (!tenantId) return NextResponse.json({ error: "Bad or missing X-Leadgen-Token." }, { status: 401 });

  const url = new URL(req.url);
  const phone = url.searchParams.get("phone");

  const shape = (l: any) => ({
    id: l.id, campaign_id: l.campaignId, name: l.name, phone: l.phone, email: l.email, address: l.address, status: l.status,
  });

  if (phone) {
    const key = phoneKey(phone);
    if (key.length < 7) return NextResponse.json({ found: false });
    const rows = await prisma.lgLead.findMany({ where: { tenantId, phone: { contains: key } }, orderBy: { createdAt: "desc" }, take: 5 });
    const lead = rows.find((r) => phoneKey(r.phone) === key);
    return NextResponse.json(lead ? { found: true, lead: shape(lead) } : { found: false });
  }

  const status = (url.searchParams.get("status") || "SCRAPED").toUpperCase();
  const campaignId = url.searchParams.get("campaign_id");
  const limit = Math.min(Math.max(parseInt(url.searchParams.get("limit") || "50", 10) || 50, 1), 200);
  const rows = await prisma.lgLead.findMany({
    where: { tenantId, status, ...(campaignId ? { campaignId } : {}) },
    orderBy: { createdAt: "asc" },
    take: limit,
  });
  return NextResponse.json({ leads: rows.map(shape) });
}
