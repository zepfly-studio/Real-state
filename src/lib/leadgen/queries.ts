import { prisma } from "@/lib/prisma";
import { phoneKey, REACHED_EMAIL, REACHED_WHATSAPP } from "./stages";

/** Server-side reads shared by the pages and the assistant. Always scoped by tenant. */

export interface LgLeadRow {
  id: string;
  campaignId: string | null;
  campaignName: string | null;
  name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  title: string | null;
  company: string | null;
  website: string | null;
  linkedin: string | null;
  city: string | null;
  score: number;
  status: string;
  askingPrice: number | null;
  timeline: string | null;
  crmLeadId: string | null;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

export async function listLeads(tenantId: string, opts: { campaignId?: string; limit?: number } = {}): Promise<LgLeadRow[]> {
  const rows = await prisma.lgLead.findMany({
    where: { tenantId, ...(opts.campaignId ? { campaignId: opts.campaignId } : {}) },
    orderBy: { updatedAt: "desc" },
    take: opts.limit ?? 500,
  });
  const campaigns = await prisma.lgCampaign.findMany({ where: { tenantId }, select: { id: true, name: true } });
  const cname = new Map(campaigns.map((c) => [c.id, c.name]));
  const counts = await prisma.lgMessage.groupBy({ by: ["leadId"], where: { tenantId, leadId: { not: null } }, _count: { _all: true } });
  const cnt = new Map(counts.map((c) => [c.leadId as string, c._count._all]));
  return rows.map((r) => ({
    id: r.id,
    campaignId: r.campaignId,
    campaignName: r.campaignId ? cname.get(r.campaignId) ?? null : null,
    name: r.name,
    phone: r.phone,
    email: r.email,
    address: r.address,
    title: r.title,
    company: r.company,
    website: r.website,
    linkedin: r.linkedin,
    city: r.city,
    score: r.score,
    status: r.status,
    askingPrice: r.askingPrice == null ? null : Number(r.askingPrice),
    timeline: r.timeline,
    crmLeadId: r.crmLeadId,
    messageCount: cnt.get(r.id) ?? 0,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));
}

export interface ThreadRow {
  phone: string;
  leadId: string | null;
  leadName: string | null;
  leadStatus: string | null;
  messages: Array<{ id: string; direction: "INBOUND" | "OUTBOUND"; text: string; at: string }>;
}

/** WhatsApp traffic grouped into one thread per phone number, newest thread first. */
export async function listThreads(tenantId: string, limit = 800): Promise<ThreadRow[]> {
  const msgs = await prisma.lgMessage.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" }, take: limit });
  msgs.reverse();
  const leadIds = Array.from(new Set(msgs.map((m) => m.leadId).filter(Boolean) as string[]));
  const leads = leadIds.length
    ? await prisma.lgLead.findMany({ where: { tenantId, id: { in: leadIds } }, select: { id: true, name: true, status: true } })
    : [];
  const lead = new Map(leads.map((l) => [l.id, l]));
  const threads = new Map<string, ThreadRow>();
  for (const m of msgs) {
    const key = phoneKey(m.phone) || m.phone;
    const l = m.leadId ? lead.get(m.leadId) : undefined;
    const t = threads.get(key) ?? { phone: m.phone, leadId: m.leadId, leadName: l?.name ?? null, leadStatus: l?.status ?? null, messages: [] };
    if (l?.name && !t.leadName) t.leadName = l.name;
    if (m.leadId && !t.leadId) t.leadId = m.leadId;
    t.messages.push({ id: m.id, direction: m.direction === "INBOUND" ? "INBOUND" : "OUTBOUND", text: m.text, at: m.createdAt.toISOString() });
    threads.set(key, t);
  }
  return Array.from(threads.values()).sort((a, b) => b.messages[b.messages.length - 1].at.localeCompare(a.messages[a.messages.length - 1].at));
}

export interface Metrics {
  leads: number;
  emailed: number;
  messaged: number;
  interested: number;
  notInterested: number;
  chats: number;
  replied: number;
  messages: number;
}

export async function metrics(tenantId: string, campaignId?: string): Promise<Metrics> {
  const where = { tenantId, ...(campaignId ? { campaignId } : {}) };
  const groups = await prisma.lgLead.groupBy({ by: ["status"], where, _count: { _all: true } });
  const by = (statuses: string[]) => groups.filter((g) => statuses.includes(g.status)).reduce((s, g) => s + g._count._all, 0);
  const threads = await listThreads(tenantId);
  return {
    leads: groups.reduce((s, g) => s + g._count._all, 0),
    emailed: by(REACHED_EMAIL),
    messaged: by(REACHED_WHATSAPP),
    interested: by(["HOT_LEAD"]),
    notInterested: by(["UNQUALIFIED"]),
    chats: threads.length,
    replied: threads.filter((t) => t.messages.some((m) => m.direction === "INBOUND")).length,
    messages: threads.reduce((s, t) => s + t.messages.length, 0),
  };
}

export async function listEvents(tenantId: string, limit = 30) {
  const rows = await prisma.lgEvent.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" }, take: limit });
  return rows.map((e) => ({ id: e.id, type: e.type, detail: e.detail ?? "", at: e.createdAt.toISOString() }));
}

export async function listCampaigns(tenantId: string) {
  const rows = await prisma.lgCampaign.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" }, take: 100 });
  const groups = await prisma.lgLead.groupBy({ by: ["campaignId", "status"], where: { tenantId, campaignId: { not: null } }, _count: { _all: true } });
  return rows.map((c) => {
    const mine = groups.filter((g) => g.campaignId === c.id);
    const total = mine.reduce((s, g) => s + g._count._all, 0);
    const interested = mine.filter((g) => g.status === "HOT_LEAD").reduce((s, g) => s + g._count._all, 0);
    return {
      id: c.id,
      name: c.name,
      location: c.targetLocation,
      target: c.leadTarget,
      status: c.status,
      leads: total,
      interested,
      filtered: c.filtered,
      target_people: (c.plan as any)?.target ?? null,
      createdAt: c.createdAt.toISOString(),
    };
  });
}
