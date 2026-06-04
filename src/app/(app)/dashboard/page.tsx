import { requireUser, resolveTenantId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { KPICard, Card, PageHeader } from "@/components/ui";
import { RevenueBar } from "@/components/charts";
import { inr, inrFull, initials } from "@/lib/format";
import { Icon } from "@/components/Icon";
import Link from "next/link";

const STAGE_META: Record<string, { label: string; color: string }> = {
  NEW: { label: "New", color: "#5b8def" },
  CONTACTED: { label: "Contacted", color: "#9b7ef0" },
  SITE_VISIT: { label: "Site Visit", color: "#f0c14b" },
  NEGOTIATION: { label: "Negotiation", color: "#d9a441" },
  CLOSED_WON: { label: "Closed Won", color: "#3ec78d" },
  CLOSED_LOST: { label: "Closed Lost", color: "#f0556a" },
};

const MONTHS = ["Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun"];

export default async function DashboardPage() {
  const user = await requireUser();
  const tenantId = await resolveTenantId(user);

  if (!tenantId) {
    return <div className="text-txt-dim">No tenant context.</div>;
  }

  const [leads, bookings, users, news, targets] = await Promise.all([
    prisma.lead.findMany({ where: { tenantId }, include: { assignedTo: true } }),
    prisma.booking.findMany({ where: { tenantId } }),
    prisma.user.findMany({ where: { tenantId } }),
    prisma.newsItem.findMany({ orderBy: { publishedAt: "desc" }, take: 5 }),
    prisma.target.findMany({ where: { tenantId, month: "2026-06" } }),
  ]);

  const now = new Date();
  const monthKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}`;
  const thisKey = monthKey(now);
  const lastKey = monthKey(new Date(now.getFullYear(), now.getMonth() - 1, 1));

  const totalRevenue = bookings.reduce((s, b) => s + Number(b.amount), 0);
  const activeLeads = leads.filter((l) => !["CLOSED_WON", "CLOSED_LOST"].includes(l.stage)).length;
  const wonLeads = leads.filter((l) => l.stage === "CLOSED_WON");
  const won = wonLeads.length;
  const conversion = leads.length ? (won / leads.length) * 100 : 0;

  // ── Real month-over-month deltas (no hardcoded figures) ──
  const inMonth = <T extends { createdAt: Date }>(rows: T[], key: string) => rows.filter((r) => monthKey(r.createdAt) === key);
  const revThis = inMonth(bookings, thisKey).reduce((s, b) => s + Number(b.amount), 0);
  const revLast = inMonth(bookings, lastKey).reduce((s, b) => s + Number(b.amount), 0);
  const leadsThis = inMonth(leads, thisKey).length;
  const leadsLast = inMonth(leads, lastKey).length;
  const bookingsMTD = inMonth(bookings, thisKey).length;
  const bookingsLast = inMonth(bookings, lastKey).length;
  const wonThis = inMonth(wonLeads, thisKey).length;
  const convThis = leadsThis ? (wonThis / leadsThis) * 100 : 0;
  const convLast = leadsLast ? (inMonth(wonLeads, lastKey).length / leadsLast) * 100 : 0;

  // delta helpers — return undefined when there's no prior-period baseline (so we never fake a number)
  const pctDelta = (cur: number, prev: number): string | undefined =>
    prev > 0 ? `${cur - prev >= 0 ? "+" : ""}${(((cur - prev) / prev) * 100).toFixed(1)}%` : undefined;
  const revenueDelta = pctDelta(revThis, revLast);
  const leadsDelta = pctDelta(leadsThis, leadsLast);
  const bookingsDelta = bookingsLast > 0 || bookingsMTD > 0 ? `${bookingsMTD - bookingsLast >= 0 ? "+" : ""}${bookingsMTD - bookingsLast}` : undefined;
  const convDelta = convLast > 0 ? `${convThis - convLast >= 0 ? "+" : ""}${(convThis - convLast).toFixed(1)}%` : undefined;

  // ── Real revenue chart: actual booking revenue for the last 7 calendar months ──
  const revenueData = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (6 - i), 1);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const value = bookings.filter((b) => monthKey(b.createdAt) === key).reduce((s, b) => s + Number(b.amount), 0);
    return { month: d.toLocaleDateString("en-IN", { month: "short" }), value };
  });

  // Pipeline
  const pipeline = (Object.keys(STAGE_META) as string[]).map((stage) => ({
    stage,
    ...STAGE_META[stage],
    count: leads.filter((l) => l.stage === stage).length,
    value: leads.filter((l) => l.stage === stage).reduce((s, l) => s + Number(l.value), 0),
  }));
  const maxStage = Math.max(...pipeline.map((p) => p.count), 1);

  // Top performers
  const targetMap = new Map(targets.map((t) => [t.userId, Number(t.targetValue)]));
  const performers = users
    .filter((u) => ["ADMIN", "MANAGER", "EMPLOYEE"].includes(u.role))
    .map((u) => {
      const closedVal = wonLeads.filter((l) => l.assignedToId === u.id).reduce((s, l) => s + Number(l.value), 0);
      const target = targetMap.get(u.id) ?? 25000000;
      return { name: u.name, color: u.avatarColor, closedVal, target, pct: Math.min(100, (closedVal / target) * 100) };
    })
    .sort((a, b) => b.closedVal - a.closedVal)
    .slice(0, 5);

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${user.name.split(" ")[0]} 👋`}
        subtitle="Here's what's happening across your business today."
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPICard label="Total Revenue" value={inr(totalRevenue)} delta={revenueDelta} icon="IndianRupee" accent="gold" />
        <KPICard label="Active Leads" value={String(activeLeads)} delta={leadsDelta} icon="Users" accent="blue" />
        <KPICard label="Bookings MTD" value={String(bookingsMTD)} delta={bookingsDelta} icon="FileCheck2" accent="green" />
        <KPICard label="Conversion" value={`${conversion.toFixed(1)}%`} delta={convDelta} icon="TrendingUp" accent="purple" />
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        {/* Revenue chart */}
        <Card className="lg:col-span-2 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-display font-bold text-lg">Revenue Trend</h3>
              <p className="text-txt-dim text-sm">Closed business, last 7 months</p>
            </div>
            <span className="tag bg-gold-soft text-gold-bright">Live</span>
          </div>
          <RevenueBar data={revenueData} />
        </Card>

        {/* Pipeline */}
        <Card className="p-5">
          <h3 className="font-display font-bold text-lg mb-4">Lead Pipeline</h3>
          <div className="space-y-3.5">
            {pipeline.map((p) => (
              <div key={p.stage}>
                <div className="flex items-center justify-between text-sm mb-1.5">
                  <span className="text-txt-dim">{p.label}</span>
                  <span className="font-semibold">{p.count}</span>
                </div>
                <div className="h-2 rounded-full bg-bg-2 overflow-hidden">
                  <div
                    className="h-full rounded-full animate-grow-bar origin-left"
                    style={{ width: `${(p.count / maxStage) * 100}%`, background: p.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Top performers */}
        <Card className="lg:col-span-2 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-bold text-lg">Top Performers</h3>
            <Link href="/crm" className="text-sm text-gold-bright">View CRM →</Link>
          </div>
          <div className="space-y-3">
            {performers.map((p, i) => (
              <div key={p.name} className="flex items-center gap-3">
                <span className="text-txt-faint font-display font-bold w-5 text-sm">{i + 1}</span>
                <span className="grid place-items-center w-9 h-9 rounded-full text-[12px] font-bold text-[#1a1205]" style={{ background: p.color }}>
                  {initials(p.name)}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold truncate">{p.name}</span>
                    <span className="text-gold-bright font-semibold">{inr(p.closedVal)}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-bg-2 mt-1.5 overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-gold to-gold-bright animate-grow-bar origin-left" style={{ width: `${p.pct}%` }} />
                  </div>
                </div>
                <span className="text-xs text-txt-faint w-12 text-right">{p.pct.toFixed(0)}%</span>
              </div>
            ))}
          </div>
        </Card>

        {/* News feed */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-bold text-lg">Live News</h3>
            <Link href="/news" className="text-sm text-gold-bright">All →</Link>
          </div>
          <div className="space-y-3">
            {news.map((n) => (
              <a key={n.id} href={n.url ?? "#"} target="_blank" rel="noreferrer" className="block group">
                <div className="flex items-start gap-2">
                  <span className="mt-1 text-gold-bright"><Icon name="Newspaper" size={14} /></span>
                  <div>
                    <div className="text-[13px] font-medium leading-snug group-hover:text-gold-bright transition-colors line-clamp-2">{n.title}</div>
                    <div className="text-[11px] text-txt-faint mt-0.5">{n.source} · {n.category}</div>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
