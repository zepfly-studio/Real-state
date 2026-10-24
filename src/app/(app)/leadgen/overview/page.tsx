import Link from "next/link";
import { Card, EmptyState, KPICard, PageHeader } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { getIntegration } from "@/lib/integrations";
import { requireModule } from "@/lib/leadgen/guard";
import { listCampaigns, listEvents, listLeads, metrics } from "@/lib/leadgen/queries";
import { EVENT_LABEL } from "@/lib/leadgen/stages";
import { timeAgo } from "@/lib/format";
import { LaunchCard } from "@/components/leadgen/LaunchCard";
import { EmailSummaryCard } from "@/components/leadgen/EmailSummaryCard";
import { ReadyList } from "@/components/leadgen/ReadyList";
import { AutoRefresh } from "@/components/leadgen/kit";

export const dynamic = "force-dynamic";

const pctOf = (n: number, d: number) => (d ? Math.round((n * 100) / d) : 0);

export default async function LeadgenOverview() {
  const { tenantId } = await requireModule("leadgen");

  const [m, campaigns, events, leads, smart, wa, gem, n8n] = await Promise.all([
    metrics(tenantId),
    listCampaigns(tenantId),
    listEvents(tenantId, 12),
    listLeads(tenantId, { limit: 500 }),
    getIntegration(tenantId, "SMARTLEAD"),
    getIntegration(tenantId, "EVOLUTION_KEY"),
    getIntegration(tenantId, "OPENAI"),
    getIntegration(tenantId, "N8N_WEBHOOK"),
  ]);
  const ready = leads.filter((l) => l.status === "HOT_LEAD").slice(0, 6);
  const connected = [smart, wa, gem, n8n].filter(Boolean).length;
  const automationDown = events.some((e) => e.type === "n8n_dispatch_failed");
  const lastSearch = events.find((e) => e.type.startsWith("lead_search_"));
  const searchFailed = lastSearch?.type === "lead_search_failed" ? lastSearch : null;

  const funnel = [
    { label: "Prospects found", value: m.leads, color: "var(--txt-faint)", hint: "Found and saved" },
    { label: "Emailed", value: m.emailed, color: "var(--blue)", hint: "Cold email queued in Smartlead" },
    { label: "Messaged", value: m.messaged, color: "var(--purple)", hint: "WhatsApp intro sent" },
    { label: "Interested", value: m.interested, color: "var(--green)", hint: "Open to selling" },
  ];

  return (
    <div>
      <AutoRefresh seconds={20} />
      <PageHeader
        title="Lead Generation"
        subtitle="Find sellers, email and WhatsApp them, and let the AI answer — then move the interested ones into your CRM."
        icon="Rocket"
        actions={<Link href="/leadgen/leads" className="btn"><Icon name="UserSearch" size={15} /> All prospects</Link>}
      />

      {connected < 4 && (
        <div className="card p-4 flex items-center gap-3 border-dashed mb-5">
          <div className="grid place-items-center w-9 h-9 rounded-lg bg-gold-soft text-gold-bright"><Icon name="PlugZap" size={17} /></div>
          <div className="text-sm flex-1">
            <span className="font-semibold">Finish setup — {connected} of 4 tools connected.</span>{" "}
            <span className="text-txt-dim">Smartlead (email), WhatsApp, ChatGPT (assistant) and n8n (automation) each need a key, once.</span>
          </div>
          <Link href="/leadgen/setup" className="text-sm font-semibold text-gold-bright whitespace-nowrap">Open Setup →</Link>
        </div>
      )}
      {automationDown && connected === 4 && (
        <div className="card p-4 flex items-center gap-3 mb-5 border-red/40">
          <span className="text-red"><Icon name="TriangleAlert" size={18} /></span>
          <div className="text-sm"><span className="font-semibold">Automation isn&apos;t running.</span> <span className="text-txt-dim">The last campaign couldn&apos;t reach n8n. Publish the workflow in n8n, then launch again.</span></div>
        </div>
      )}

      {searchFailed && (
        <div className="card p-4 flex items-center gap-3 mb-5 border-red/40" role="alert">
          <span className="text-red"><Icon name="SearchX" size={18} /></span>
          <div className="text-sm min-w-0"><span className="font-semibold">The last campaign couldn&apos;t find sellers.</span> <span className="text-txt-dim break-words">{searchFailed.detail.replace(/^Lead search failed: /, "")} — check the Apify actor ID and token in n8n.</span></div>
        </div>
      )}

      <LaunchCard automationReady={Boolean(n8n)} />

      <section aria-label="Key numbers" className="grid grid-cols-2 xl:grid-cols-5 gap-4 mb-6">
        <KPICard label="Prospects found" value={String(m.leads)} icon="Users" accent="gold" />
        <KPICard label="Emails sent" value={String(m.emailed)} icon="Mail" accent="blue" />
        <KPICard label="WhatsApp sent" value={String(m.messaged)} icon="MessageCircle" accent="purple" />
        <KPICard label="Replies" value={String(m.replied)} icon="Reply" accent="gold" />
        <KPICard label="Interested" value={String(m.interested)} icon="Star" accent="green" />
      </section>

      <section className="grid gap-5 lg:grid-cols-2 mb-6">
        <EmailSummaryCard />
        <div className="card p-5">
          <div className="flex items-center gap-2.5 mb-4">
            <span className="grid place-items-center w-8 h-8 rounded-lg bg-gold-soft text-gold-bright"><Icon name="MessageCircle" size={16} /></span>
            <h3 className="font-display font-bold">WhatsApp</h3>
            <span className="ml-auto text-xs text-txt-faint">Evolution</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              ["Messaged", m.messaged, "prospects"],
              ["Chats", m.chats, ""],
              ["Replied", m.replied, m.chats ? `${pctOf(m.replied, m.chats)}% of chats` : ""],
            ].map(([label, value, sub]) => (
              <div key={label as string} className="min-w-0">
                <div className="text-[11px] uppercase tracking-wide text-txt-faint font-semibold">{label}</div>
                <div className="font-display text-2xl font-bold mt-1">{value}</div>
                {sub && <div className="text-xs text-txt-dim mt-0.5 truncate">{sub}</div>}
              </div>
            ))}
          </div>
          <Link href="/leadgen/inbox" className="text-sm font-semibold text-gold-bright mt-4 inline-flex items-center gap-1">Open inbox <Icon name="ArrowRight" size={14} /></Link>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-5 mb-6">
        <Card className="p-5 lg:col-span-3 min-w-0">
          <div className="flex items-start justify-between gap-3 mb-1">
            <div>
              <h3 className="font-display font-bold">Conversion funnel</h3>
              <p className="text-sm text-txt-dim">Prospects move through each stage automatically.</p>
            </div>
            <span className="tag bg-[rgba(62,199,141,.14)] text-green shrink-0">{pctOf(m.interested, m.leads)}% interested</span>
          </div>
          <div className="mt-5 space-y-4">
            {funnel.map((f, i) => (
              <div key={f.label}>
                <div className="flex items-baseline justify-between text-sm mb-1.5">
                  <span className="font-semibold">{f.label} <span className="text-xs text-txt-faint font-normal">· {f.hint}</span></span>
                  <span className="tabular-nums font-semibold">{f.value} <span className="text-xs text-txt-faint font-normal">{pctOf(f.value, m.leads)}%</span></span>
                </div>
                <div className="h-2.5 rounded-full bg-panel-2 overflow-hidden" role="img" aria-label={`${f.label}: ${f.value}`}>
                  <div className="h-full rounded-full" style={{ width: `${pctOf(f.value, m.leads)}%`, background: f.color }} />
                </div>
                {i < funnel.length - 1 && funnel[i].value > 0 && (
                  <div className="text-[11px] text-txt-faint mt-1">{pctOf(funnel[i + 1].value, funnel[i].value)}% continue</div>
                )}
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5 lg:col-span-2 min-w-0">
          <h3 className="font-display font-bold">Activity</h3>
          <p className="text-sm text-txt-dim mb-3">Newest events first.</p>
          {events.length === 0 ? (
            <EmptyState icon="Activity" title="Nothing yet" hint="Launch a campaign and its progress shows here." />
          ) : (
            <ul className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
              {events.map((e) => (
                <li key={e.id} className="flex gap-3">
                  <span className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${e.type.includes("failed") || e.type === "lead_search_empty" ? "bg-red" : e.type === "status_change" ? "bg-purple" : e.type === "lead_scraped" ? "bg-blue" : "bg-gold"}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-sm font-semibold">{EVENT_LABEL[e.type] ?? e.type}</span>
                      <span className="text-[11px] text-txt-faint whitespace-nowrap">{timeAgo(e.at)}</span>
                    </div>
                    <p className="text-xs text-txt-dim break-words">{e.detail}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>

      <section className="grid gap-5 lg:grid-cols-5">
        <Card className="p-5 lg:col-span-3 min-w-0">
          <h3 className="font-display font-bold">Campaigns</h3>
          <p className="text-sm text-txt-dim mb-3">Each launch you made, and how it&apos;s doing.</p>
          {campaigns.length === 0 ? (
            <EmptyState icon="Rocket" title="No campaigns yet" hint="Say or type who you want to find above, then launch." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs text-txt-faint font-semibold uppercase tracking-wide">
                    <th className="py-2 pr-4">Campaign</th><th className="py-2 pr-4">Prospects</th><th className="py-2 pr-4">Interested</th><th className="py-2 pr-4">Status</th><th className="py-2">Started</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.slice(0, 6).map((c) => (
                    <tr key={c.id} className="border-b border-line/40">
                      <td className="py-2.5 pr-4"><div className="font-semibold">{c.name}</div><div className="text-xs text-txt-dim">{c.location || "—"}</div></td>
                      <td className="py-2.5 pr-4 tabular-nums">{c.leads}{c.target ? <span className="text-txt-faint"> / {c.target}</span> : null}</td>
                      <td className="py-2.5 pr-4 tabular-nums">{c.interested}</td>
                      <td className="py-2.5 pr-4"><span className={`tag ${c.status === "ACTIVE" ? "bg-[rgba(62,199,141,.14)] text-green" : c.status === "FAILED" ? "bg-[rgba(240,85,106,.14)] text-red" : c.status === "PENDING" ? "bg-gold-soft text-gold-bright" : "bg-panel-2 text-txt-dim"}`}>{c.status === "PENDING" ? "Not started" : c.status === "SCRAPING" ? "Finding leads" : c.status === "ACTIVE" ? "Running" : c.status === "FAILED" ? "Failed" : "Completed"}</span></td>
                      <td className="py-2.5 text-txt-dim whitespace-nowrap">{timeAgo(c.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card className="p-5 lg:col-span-2 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-display font-bold">Ready to talk to</h3>
              <p className="text-sm text-txt-dim mb-1">Sellers who said they&apos;re open to selling.</p>
            </div>
            {ready.length > 0 && <Link href="/leadgen/leads?stage=HOT_LEAD" className="text-sm font-semibold text-gold-bright whitespace-nowrap">View all</Link>}
          </div>
          <ReadyList leads={ready.map((l) => ({ id: l.id, name: l.name, phone: l.phone, address: l.address, askingPrice: l.askingPrice, timeline: l.timeline, crmLeadId: l.crmLeadId }))} />
        </Card>
      </section>
    </div>
  );
}
