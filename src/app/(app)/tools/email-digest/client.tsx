"use client";

import { useState, useEffect } from "react";
import { Card, PageHeader, Badge, ConnectBanner, EmptyState } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { timeAgo, initials } from "@/lib/format";

// ─── Types ────────────────────────────────────────────────────────────────────

type DigestSection = "urgent" | "attention" | "fyi";

interface DigestItem {
  id: string;
  section: DigestSection;
  title: string;
  context: string; // one-line context string
  tag: string;
  tagTone: "red" | "gold" | "blue" | "green" | "purple" | "neutral";
  href: string;
  date: string; // ISO string
  done: boolean;
}

// Types that mirror what page.tsx sends down
interface LeadRow {
  id: string;
  name: string;
  propertyType: string;
  location: string;
  source: string;
  stage: string;
  temperature: string;
  createdAt: string;
  nextFollowUp: string | null;
}

interface ApprovalRow {
  id: string;
  type: string;
  createdAt: string;
  note: string | null;
  lead: { name: string; propertyType: string; location: string } | null;
  requestedBy: { name: string };
}

interface ActivityRow {
  id: string;
  type: string;
  description: string;
  createdAt: string;
  lead: { name: string; propertyType: string; location: string } | null;
}

interface DigestData {
  recentLeads: LeadRow[];
  overdueLeads: LeadRow[];
  todayFollowUps: LeadRow[];
  pendingApprovals: ApprovalRow[];
  recentActivities: ActivityRow[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sourceLabel(source: string): string {
  const map: Record<string, string> = {
    WEBSITE: "Website",
    REFERRAL: "Referral",
    WALK_IN: "Walk-in",
    PORTAL_99ACRES: "99acres",
    PORTAL_MAGICBRICKS: "MagicBricks",
    META_ADS: "Meta Ads",
    GOOGLE_ADS: "Google Ads",
    CHANNEL_PARTNER: "Channel Partner",
    COLD_CALL: "Cold Call",
    WHATSAPP: "WhatsApp",
  };
  return map[source] ?? source;
}

function activityTypeLabel(type: string): string {
  const map: Record<string, string> = {
    CALL: "Call",
    NOTE: "Note",
    STAGE_CHANGE: "Stage Change",
    WHATSAPP: "WhatsApp",
    SITE_VISIT: "Site Visit",
    EMAIL: "Email",
  };
  return map[type] ?? type;
}

/** Build the flat list of DigestItems from the raw DB data */
function buildDigest(data: DigestData): DigestItem[] {
  const items: DigestItem[] = [];

  // URGENT: overdue follow-ups
  for (const lead of data.overdueLeads) {
    items.push({
      id: `overdue-${lead.id}`,
      section: "urgent",
      title: `Overdue follow-up: ${lead.name}`,
      context: `${lead.propertyType} · ${lead.location} · Due ${lead.nextFollowUp ? new Date(lead.nextFollowUp).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "—"}`,
      tag: "Overdue",
      tagTone: "red",
      href: "/crm",
      date: lead.nextFollowUp ?? lead.createdAt,
      done: false,
    });
  }

  // URGENT: pending approvals
  for (const approval of data.pendingApprovals) {
    const leadName = approval.lead?.name ?? "—";
    items.push({
      id: `approval-${approval.id}`,
      section: "urgent",
      title: `Pending ${approval.type.toLowerCase()} approval${approval.lead ? `: ${leadName}` : ""}`,
      context: `Requested by ${approval.requestedBy.name}${approval.lead ? ` · ${approval.lead.propertyType} · ${approval.lead.location}` : ""}`,
      tag: "Approval",
      tagTone: "red",
      href: "/crm",
      date: approval.createdAt,
      done: false,
    });
  }

  // ATTENTION: new leads in last 48h
  const cutoff48h = Date.now() - 48 * 60 * 60 * 1000;
  const newLeads48h = data.recentLeads.filter(
    (l) => new Date(l.createdAt).getTime() >= cutoff48h
  );
  for (const lead of newLeads48h) {
    items.push({
      id: `new-${lead.id}`,
      section: "attention",
      title: `New enquiry: ${lead.name}`,
      context: `${lead.propertyType} · ${lead.location} · via ${sourceLabel(lead.source)}`,
      tag: "New Lead",
      tagTone: "blue",
      href: "/crm",
      date: lead.createdAt,
      done: false,
    });
  }

  // ATTENTION: today's follow-ups
  for (const lead of data.todayFollowUps) {
    items.push({
      id: `today-${lead.id}`,
      section: "attention",
      title: `Follow-up today: ${lead.name}`,
      context: `${lead.propertyType} · ${lead.location} · Stage: ${lead.stage.replace(/_/g, " ")}`,
      tag: "Follow-up",
      tagTone: "gold",
      href: "/crm",
      date: lead.nextFollowUp ?? lead.createdAt,
      done: false,
    });
  }

  // FYI: recent activities
  for (const act of data.recentActivities) {
    const leadName = act.lead?.name ?? "Unknown";
    items.push({
      id: `act-${act.id}`,
      section: "fyi",
      title: `${activityTypeLabel(act.type)}: ${leadName}`,
      context: act.description.slice(0, 120),
      tag: activityTypeLabel(act.type),
      tagTone: "neutral",
      href: "/crm",
      date: act.createdAt,
      done: false,
    });
  }

  return items;
}

// ─── Section config ───────────────────────────────────────────────────────────

const SECTION_CONFIG: Record<DigestSection, { label: string; icon: string; color: string; accent: string }> = {
  urgent: {
    label: "Urgent",
    icon: "AlertCircle",
    color: "text-red",
    accent: "bg-[rgba(240,85,106,.14)]",
  },
  attention: {
    label: "Needs Attention",
    icon: "Bell",
    color: "text-gold-bright",
    accent: "bg-gold-soft",
  },
  fyi: {
    label: "FYI",
    icon: "Info",
    color: "text-txt-faint",
    accent: "bg-panel-2",
  },
};

const TAG_TONE_MAP: Record<string, "red" | "gold" | "blue" | "green" | "purple" | "neutral"> = {
  red: "red",
  gold: "gold",
  blue: "blue",
  green: "green",
  purple: "purple",
  neutral: "neutral",
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  hasGmail: boolean;
  tenantId: string;
  userName: string;
  data: DigestData;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function EmailDigestClient({ hasGmail, tenantId: _tenantId, userName, data }: Props) {
  const [items, setItems] = useState<DigestItem[]>(() => buildDigest(data));
  const [activeSection, setActiveSection] = useState<DigestSection | "all">("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  // Relative timestamps are client-only — avoids SSR hydration mismatch
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await fetch("/api/email-digest");
      showToast("Digest refreshed.");
    } catch {
      // swallow
    } finally {
      setRefreshing(false);
    }
  }

  function markDone(id: string) {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, done: true } : it)));
  }

  const active = items.filter((it) => !it.done);
  const urgentCount = active.filter((it) => it.section === "urgent").length;
  const attentionCount = active.filter((it) => it.section === "attention").length;
  const fyiCount = active.filter((it) => it.section === "fyi").length;

  const filtered =
    activeSection === "all" ? active : active.filter((it) => it.section === activeSection);

  const grouped: { section: DigestSection; items: DigestItem[] }[] = (
    ["urgent", "attention", "fyi"] as DigestSection[]
  )
    .map((s) => ({ section: s, items: filtered.filter((it) => it.section === s) }))
    .filter((g) => g.items.length > 0);

  return (
    <div>
      <PageHeader
        title="Activity Digest"
        subtitle={`Real-time digest from your CRM — leads, follow-ups & approvals for ${userName.split(" ")[0]}.`}
        icon="Mail"
        actions={
          <div className="flex items-center gap-2">
            <span className="tag bg-[rgba(62,199,141,.14)] text-green">
              <Icon name="Database" size={12} />
              <span className="ml-1">Live DB</span>
            </span>
            <button
              className="btn btn-primary flex items-center gap-1.5 text-sm"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              {refreshing ? (
                <span className="animate-spin inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <Icon name="RefreshCw" size={14} />
              )}
              {refreshing ? "Refreshing…" : "Refresh"}
            </button>
          </div>
        }
      />

      {/* Summary row */}
      <div className="card p-5 mb-5 flex flex-wrap items-center gap-6">
        <div className="flex items-center gap-3">
          <div className="grid place-items-center w-11 h-11 rounded-xl bg-[rgba(240,85,106,.14)] text-red">
            <Icon name="AlertCircle" size={20} />
          </div>
          <div>
            <div className="font-display text-2xl font-bold">{urgentCount}</div>
            <div className="text-txt-dim text-xs font-semibold uppercase tracking-wide">Urgent</div>
          </div>
        </div>
        <div className="h-10 w-px bg-line hidden sm:block" />
        <div className="flex items-center gap-3">
          <div className="grid place-items-center w-11 h-11 rounded-xl bg-gold-soft text-gold-bright">
            <Icon name="Bell" size={20} />
          </div>
          <div>
            <div className="font-display text-2xl font-bold">{attentionCount}</div>
            <div className="text-txt-dim text-xs font-semibold uppercase tracking-wide">Needs Attention</div>
          </div>
        </div>
        <div className="h-10 w-px bg-line hidden sm:block" />
        <div className="flex items-center gap-3">
          <div className="grid place-items-center w-11 h-11 rounded-xl bg-panel-2 text-txt-faint">
            <Icon name="Info" size={20} />
          </div>
          <div>
            <div className="font-display text-2xl font-bold">{fyiCount}</div>
            <div className="text-txt-dim text-xs font-semibold uppercase tracking-wide">FYI</div>
          </div>
        </div>
        <div className="ml-auto text-sm text-txt-faint">
          <span className="text-txt">{active.length}</span> active items
        </div>
      </div>

      {/* Gmail connect card */}
      {hasGmail ? (
        <div className="card p-4 flex items-center gap-3 mb-5 border-[rgba(62,199,141,.25)]">
          <div className="grid place-items-center w-9 h-9 rounded-lg bg-[rgba(62,199,141,.14)] text-green">
            <Icon name="Mail" size={17} />
          </div>
          <div className="text-sm">
            <span className="font-semibold text-green">Gmail connected.</span>{" "}
            <span className="text-txt-dim">
              Your Gmail inbox can be summarised here — implement{" "}
              <code className="text-txt bg-panel-2 px-1 rounded text-xs">fetchGmailInbox()</code> in{" "}
              <code className="text-txt bg-panel-2 px-1 rounded text-xs">api/email-digest</code> to pull live emails.
            </span>
          </div>
        </div>
      ) : (
        <div className="card p-4 flex items-center gap-3 border-dashed mb-5">
          <div className="grid place-items-center w-9 h-9 rounded-lg bg-gold-soft text-gold-bright">
            <Icon name="Mail" size={17} />
          </div>
          <div className="text-sm flex-1">
            <span className="font-semibold">Connect Gmail to also summarise your email inbox.</span>{" "}
            <span className="text-txt-dim">
              This digest shows your real CRM data. Add your Gmail integration in{" "}
            </span>
            <a href="/settings" className="text-gold-bright font-semibold">
              Settings → Integrations
            </a>
            <span className="text-txt-dim"> to also pull and prioritise your inbox.</span>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-1 mb-5 p-1 bg-bg-2 rounded-xl w-fit">
        {(["all", "urgent", "attention", "fyi"] as const).map((f) => {
          const count =
            f === "all"
              ? active.length
              : active.filter((it) => it.section === f).length;
          return (
            <button
              key={f}
              onClick={() => setActiveSection(f)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all capitalize ${
                activeSection === f
                  ? "bg-gold text-[#0f1219]"
                  : "text-txt-dim hover:text-txt"
              }`}
            >
              {f === "all" ? "All" : f === "attention" ? "Attention" : f.charAt(0).toUpperCase() + f.slice(1)}
              <span className="ml-1.5 text-[10px] opacity-70">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Digest list */}
      <div className="space-y-5">
        {grouped.length === 0 && active.length === 0 && (
          <EmptyState
            icon="CheckCircle2"
            title="All caught up!"
            hint="No overdue follow-ups, pending approvals, or recent leads. Great work."
          />
        )}

        {grouped.length === 0 && active.length > 0 && (
          <EmptyState
            icon="Filter"
            title="No items in this category"
            hint="Switch to a different filter to see items."
          />
        )}

        {grouped.map(({ section, items: sectionItems }) => {
          const cfg = SECTION_CONFIG[section];
          return (
            <div key={section}>
              {/* Section header */}
              <div className="flex items-center gap-2 mb-3">
                <Icon name={cfg.icon} size={15} className={cfg.color} />
                <span className="section-label">{cfg.label}</span>
                <span className="tag bg-panel-2 text-txt-faint text-[10px]">
                  {sectionItems.length}
                </span>
              </div>

              <div className="space-y-2">
                {sectionItems.map((item) => (
                  <div
                    key={item.id}
                    className={`card transition-all ${
                      expandedId === item.id ? "border-gold-bright/30" : ""
                    } ${section === "urgent" ? "border-l-2 border-l-red" : ""}`}
                  >
                    <button
                      className="w-full text-left p-4"
                      onClick={() =>
                        setExpandedId(expandedId === item.id ? null : item.id)
                      }
                    >
                      <div className="flex items-start gap-3">
                        {/* Avatar / icon */}
                        <div
                          className={`grid place-items-center w-9 h-9 rounded-full text-[11px] font-bold flex-shrink-0 mt-0.5 ${cfg.accent} ${cfg.color}`}
                        >
                          <Icon name={cfg.icon} size={16} />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-txt">
                              {item.title}
                            </span>
                            <div className="flex items-center gap-2">
                              <Badge tone={TAG_TONE_MAP[item.tagTone] ?? "neutral"}>
                                {item.tag}
                              </Badge>
                              <span className="text-[11px] text-txt-faint">
                                {mounted ? timeAgo(item.date) : ""}
                              </span>
                            </div>
                          </div>
                          <p className="text-xs text-txt-faint mt-1 leading-relaxed line-clamp-2">
                            {item.context}
                          </p>
                        </div>

                        <Icon
                          name={expandedId === item.id ? "ChevronUp" : "ChevronDown"}
                          size={16}
                          className="text-txt-faint flex-shrink-0 mt-1"
                        />
                      </div>
                    </button>

                    {/* Expanded */}
                    {expandedId === item.id && (
                      <div className="px-4 pb-4 border-t border-line/30 pt-4 animate-fade-in">
                        <div className="flex items-center gap-2 text-xs text-txt-faint mb-3">
                          <Icon name="Clock" size={12} />
                          <span>
                            {mounted
                              ? new Date(item.date).toLocaleString("en-IN", {
                                  day: "numeric",
                                  month: "short",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : ""}
                          </span>
                        </div>

                        <div className="bg-panel-2 rounded-xl p-4 mb-4">
                          <p className="text-sm text-txt leading-relaxed">{item.context}</p>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          <a
                            href={item.href}
                            className="btn btn-primary flex items-center gap-1.5 text-sm"
                          >
                            <Icon name="ArrowRight" size={14} />
                            Open in CRM
                          </a>
                          <button
                            onClick={() => {
                              markDone(item.id);
                              showToast("Marked as done.");
                            }}
                            className="btn btn-ghost flex items-center gap-1.5 text-sm"
                          >
                            <Icon name="CheckCircle2" size={14} />
                            Mark Done
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Archived/done section */}
      {items.some((it) => it.done) && (
        <div className="mt-6">
          <details className="group">
            <summary className="flex items-center gap-2 text-txt-faint text-sm cursor-pointer hover:text-txt transition-colors list-none">
              <Icon name="Archive" size={14} />
              <span>{items.filter((it) => it.done).length} done</span>
              <Icon
                name="ChevronDown"
                size={13}
                className="group-open:rotate-180 transition-transform"
              />
            </summary>
            <div className="mt-3 space-y-2">
              {items
                .filter((it) => it.done)
                .map((item) => (
                  <div key={item.id} className="card p-3 opacity-50">
                    <div className="flex items-center gap-3">
                      <Icon
                        name="CheckCircle2"
                        size={14}
                        className="text-green flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm text-txt-dim line-through truncate block">
                          {item.title}
                        </span>
                        <span className="text-xs text-txt-faint">{item.context}</span>
                      </div>
                      <button
                        onClick={() =>
                          setItems((prev) =>
                            prev.map((it) =>
                              it.id === item.id ? { ...it, done: false } : it
                            )
                          )
                        }
                        className="btn btn-ghost text-xs p-1.5"
                      >
                        Restore
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </details>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 card p-4 text-sm font-medium shadow-2xl border border-line animate-fade-in">
          {toast}
        </div>
      )}
    </div>
  );
}
