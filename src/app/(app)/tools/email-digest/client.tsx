"use client";

import { useState, useEffect } from "react";
import {
  Card,
  PageHeader,
  Badge,
  ConnectBanner,
  EmptyState,
} from "@/components/ui";
import { Icon } from "@/components/Icon";
import { timeAgo, initials } from "@/lib/format";

// ─── Types ────────────────────────────────────────────────────────────────────

type Priority = "Urgent" | "Important" | "FYI";
type Action = "Reply" | "Schedule" | "Archive" | "Forward";
type Category = "Lead Enquiry" | "Vendor" | "Internal" | "Newsletter" | "Legal" | "Finance";

interface Email {
  id: string;
  sender: string;
  senderEmail: string;
  subject: string;
  summary: string;
  action: Action;
  category: Category;
  priority: Priority;
  receivedAt: string;
  read: boolean;
  done?: boolean;
}

// ─── Mock inbox ───────────────────────────────────────────────────────────────

const MOCK_EMAILS: Email[] = [
  {
    id: "e1",
    sender: "99acres Lead Alert",
    senderEmail: "leads@99acres.com",
    subject: "New Enquiry: 3BHK in Vaishali Nagar — Sunita Rao",
    summary: "Sunita Rao enquired about a 3BHK flat in Vaishali Nagar, budget ₹65–70L. Requested a callback today. Phone: 9887766554.",
    action: "Reply",
    category: "Lead Enquiry",
    priority: "Urgent",
    receivedAt: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
    read: false,
  },
  {
    id: "e2",
    sender: "MagicBricks Alerts",
    senderEmail: "noreply@magicbricks.com",
    subject: "3 new leads matched your listing: Shubh Greens Phase 2",
    summary: "Three buyer enquiries for Shubh Greens Phase 2 — Amit K. (2BHK, ₹42L), Pradeep S. (3BHK, ₹68L), Kavya M. (Plot, ₹30L). All requested callbacks within 24h.",
    action: "Reply",
    category: "Lead Enquiry",
    priority: "Urgent",
    receivedAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    read: false,
  },
  {
    id: "e3",
    sender: "Rajasthan RERA",
    senderEmail: "compliance@rera.rajasthan.gov.in",
    subject: "Notice: Quarterly Progress Report Due — Project RAJ/P/2024/001",
    summary: "Quarterly progress report for RERA project RAJ/P/2024/001 is due by 30 June 2026. Submit via the RERA portal. Non-submission attracts ₹10,000/day penalty.",
    action: "Schedule",
    category: "Legal",
    priority: "Urgent",
    receivedAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    read: true,
  },
  {
    id: "e4",
    sender: "Vikram Singh (Buyer)",
    senderEmail: "vikram.singh@gmail.com",
    subject: "Re: Shubh Heights B-304 — Loan Sanction Letter Attached",
    summary: "Vikram has received loan sanction from SBI for ₹48L. Wants to proceed with booking. Requested the agreement draft and bank details for token transfer.",
    action: "Reply",
    category: "Lead Enquiry",
    priority: "Urgent",
    receivedAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    read: false,
  },
  {
    id: "e5",
    sender: "Ramesh Tiles & Fittings",
    senderEmail: "accounts@rameshtiles.in",
    subject: "Invoice #RT-2024-0892 — ₹3,42,000 Due on 20 Jun",
    summary: "Invoice for floor tiles (2,800 sqft) and bathroom fittings for Block B. Amount ₹3,42,000. Due date 20 June 2026. NEFT details attached. GST invoice enclosed.",
    action: "Schedule",
    category: "Vendor",
    priority: "Important",
    receivedAt: new Date(Date.now() - 1000 * 60 * 60 * 7).toISOString(),
    read: true,
  },
  {
    id: "e6",
    sender: "Anil Kumar (Site Manager)",
    senderEmail: "anil.kumar@shubhrealtors.com",
    subject: "Site Update: Block C slab casting delayed by 3 days — rain",
    summary: "Block C second floor slab casting postponed to 8 June due to unseasonal rains. Contractor has confirmed revised schedule. No impact on possession date.",
    action: "Archive",
    category: "Internal",
    priority: "Important",
    receivedAt: new Date(Date.now() - 1000 * 60 * 60 * 9).toISOString(),
    read: true,
  },
  {
    id: "e7",
    sender: "HDFC Bank — Business",
    senderEmail: "noreply@hdfcbank.com",
    subject: "Current Account Statement — May 2026",
    summary: "Monthly statement for current account ending 4421 for May 2026. Opening balance ₹12.4L, closing ₹8.7L. 34 transactions. Statement PDF attached.",
    action: "Archive",
    category: "Finance",
    priority: "Important",
    receivedAt: new Date(Date.now() - 1000 * 60 * 60 * 11).toISOString(),
    read: true,
  },
  {
    id: "e8",
    sender: "Pooja Mehta (Sales)",
    senderEmail: "pooja.mehta@shubhrealtors.com",
    subject: "Weekly sales report — week of 27 May",
    summary: "6 site visits, 2 negotiation calls, 1 booking closed (Rajesh Sharma, 2BHK ₹44L). Pipeline update shared in the CRM. Requesting approval for a site visit incentive.",
    action: "Reply",
    category: "Internal",
    priority: "Important",
    receivedAt: new Date(Date.now() - 1000 * 60 * 60 * 13).toISOString(),
    read: true,
  },
  {
    id: "e9",
    sender: "SoftwareSuggest",
    senderEmail: "digest@softwaresuggest.com",
    subject: "Top 10 Real Estate CRMs in India 2026 — Weekly Digest",
    summary: "Curated list of top CRM tools for Indian real estate developers. Includes pricing comparison, feature matrix, and user reviews from JLL, Mahindra Lifespace, and others.",
    action: "Archive",
    category: "Newsletter",
    priority: "FYI",
    receivedAt: new Date(Date.now() - 1000 * 60 * 60 * 16).toISOString(),
    read: true,
  },
  {
    id: "e10",
    sender: "PropTech Insider",
    senderEmail: "news@proptechinsider.in",
    subject: "PropTech Insider Weekly: RBI rate hold, Jaipur infrastructure boost",
    summary: "RBI kept repo rate unchanged at 6.5%; Jaipur metro Phase 2 gets Union Budget allocation of ₹1,800Cr boosting real estate along Ajmer Road and Sitapura corridors.",
    action: "Archive",
    category: "Newsletter",
    priority: "FYI",
    receivedAt: new Date(Date.now() - 1000 * 60 * 60 * 18).toISOString(),
    read: true,
  },
  {
    id: "e11",
    sender: "Suresh Electricals",
    senderEmail: "suresh.electricals@gmail.com",
    subject: "Quotation for Phase 2 electrical wiring — ₹8.4L",
    summary: "Quotation for complete electrical wiring of Phase 2 (Blocks C & D, 48 units). Total ₹8,40,000. Includes conduits, switchboards, distribution boards. Valid till 30 June.",
    action: "Reply",
    category: "Vendor",
    priority: "Important",
    receivedAt: new Date(Date.now() - 1000 * 60 * 60 * 20).toISOString(),
    read: true,
  },
  {
    id: "e12",
    sender: "Google Workspace",
    senderEmail: "noreply@google.com",
    subject: "Your storage is 78% full — upgrade your plan",
    summary: "Google Workspace account shubhrealtors.com is 78% full (14.3 GB of 20 GB used). Consider upgrading to Business Standard for 2 TB per user.",
    action: "Archive",
    category: "Internal",
    priority: "FYI",
    receivedAt: new Date(Date.now() - 1000 * 60 * 60 * 22).toISOString(),
    read: true,
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const PRIORITY_ORDER: Priority[] = ["Urgent", "Important", "FYI"];

const PRIORITY_CONFIG: Record<Priority, { icon: string; color: string; tone: "red" | "gold" | "neutral" }> = {
  Urgent: { icon: "AlertCircle", color: "text-red", tone: "red" },
  Important: { icon: "Star", color: "text-gold-bright", tone: "gold" },
  FYI: { icon: "Info", color: "text-txt-faint", tone: "neutral" },
};

const CATEGORY_TONE: Record<Category, "blue" | "purple" | "green" | "neutral" | "red" | "gold"> = {
  "Lead Enquiry": "blue",
  "Vendor": "purple",
  "Internal": "green",
  "Newsletter": "neutral",
  "Legal": "red",
  "Finance": "gold",
};

const ACTION_CONFIG: Record<Action, { icon: string; label: string; color: string }> = {
  Reply: { icon: "Reply", label: "Reply", color: "btn-primary" },
  Schedule: { icon: "Calendar", label: "Schedule", color: "btn-ghost" },
  Archive: { icon: "Archive", label: "Archive", color: "btn-ghost" },
  Forward: { icon: "Forward", label: "Forward", color: "btn-ghost" },
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  hasKey: boolean;
  tenantId: string;
  userName: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function EmailDigestClient({ hasKey, tenantId: _tenantId, userName }: Props) {
  const [emails, setEmails] = useState<Email[]>(MOCK_EMAILS);
  const [activeFilter, setActiveFilter] = useState<Priority | "All">("All");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []); // relative timestamps are client-only (avoids SSR hydration mismatch)

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  async function handleRefresh() {
    setRefreshing(true);
    try {
      const res = await fetch("/api/email-digest");
      if (res.ok) {
        // In live mode the API would return real emails; in demo we just re-render
        showToast("Digest refreshed.");
      }
    } catch {
      // swallow
    } finally {
      setRefreshing(false);
    }
  }

  function handleReply(email: Email) {
    // Opens mailto in built-in mode; when Gmail is connected this would open Gmail compose
    window.open(`mailto:${email.senderEmail}?subject=Re: ${encodeURIComponent(email.subject)}`, "_blank");
  }

  function handleSchedule(email: Email) {
    showToast(`Reminder set: "${email.subject.slice(0, 40)}…"`);
  }

  function handleForward(email: Email) {
    window.open(`mailto:?subject=Fwd: ${encodeURIComponent(email.subject)}&body=${encodeURIComponent(email.summary)}`, "_blank");
  }

  const active = emails.filter((e) => !e.done);
  const urgent = active.filter((e) => e.priority === "Urgent");
  const needReply = active.filter((e) => e.action === "Reply");
  const newsletters = active.filter((e) => e.category === "Newsletter");
  const unread = active.filter((e) => !e.read);

  function markDone(id: string) {
    setEmails((prev) =>
      prev.map((e) => (e.id === id ? { ...e, done: true } : e))
    );
  }

  function archiveEmail(id: string) {
    setEmails((prev) =>
      prev.map((e) => (e.id === id ? { ...e, done: true } : e))
    );
  }

  const filtered = active.filter((e) =>
    activeFilter === "All" ? true : e.priority === activeFilter
  );

  const grouped = PRIORITY_ORDER.reduce((acc, p) => {
    const items = filtered.filter((e) => e.priority === p);
    if (items.length) acc.push({ priority: p, items });
    return acc;
  }, [] as { priority: Priority; items: Email[] }[]);

  return (
    <div>
      <PageHeader
        title="Smart Email Digest"
        subtitle={`AI-prioritised inbox for ${userName.split(" ")[0]}. Focus on what matters.`}
        icon="Mail"
        actions={
          <div className="flex items-center gap-2">
            <span
              className={`tag ${hasKey ? "bg-[rgba(62,199,141,.14)] text-green" : "bg-gold-soft text-gold-bright"}`}
            >
              <Icon name={hasKey ? "Wifi" : "WifiOff"} size={12} />
              <span className="ml-1">{hasKey ? "Live" : "Demo"}</span>
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
              {refreshing ? "Refreshing…" : "Refresh Digest"}
            </button>
          </div>
        }
      />

      {!hasKey && (
        <ConnectBanner
          name="Gmail"
          enables="Built-in AI digest with prioritised mock inbox is fully functional."
        />
      )}

      {/* Summary card */}
      <div className="card p-5 mb-5 flex flex-wrap items-center gap-6">
        <div className="flex items-center gap-3">
          <div className="grid place-items-center w-11 h-11 rounded-xl bg-[rgba(240,85,106,.14)] text-red">
            <Icon name="AlertCircle" size={20} />
          </div>
          <div>
            <div className="font-display text-2xl font-bold">{urgent.length}</div>
            <div className="text-txt-dim text-xs font-semibold uppercase tracking-wide">Urgent</div>
          </div>
        </div>
        <div className="h-10 w-px bg-line hidden sm:block" />
        <div className="flex items-center gap-3">
          <div className="grid place-items-center w-11 h-11 rounded-xl bg-gold-soft text-gold-bright">
            <Icon name="Reply" size={20} />
          </div>
          <div>
            <div className="font-display text-2xl font-bold">{needReply.length}</div>
            <div className="text-txt-dim text-xs font-semibold uppercase tracking-wide">Need Reply</div>
          </div>
        </div>
        <div className="h-10 w-px bg-line hidden sm:block" />
        <div className="flex items-center gap-3">
          <div className="grid place-items-center w-11 h-11 rounded-xl bg-panel-2 text-txt-faint">
            <Icon name="Newspaper" size={20} />
          </div>
          <div>
            <div className="font-display text-2xl font-bold">{newsletters.length}</div>
            <div className="text-txt-dim text-xs font-semibold uppercase tracking-wide">Newsletters</div>
          </div>
        </div>
        <div className="h-10 w-px bg-line hidden sm:block" />
        <div className="flex items-center gap-3">
          <div className="grid place-items-center w-11 h-11 rounded-xl bg-[rgba(91,141,239,.14)] text-blue">
            <Icon name="MailOpen" size={20} />
          </div>
          <div>
            <div className="font-display text-2xl font-bold">{unread.length}</div>
            <div className="text-txt-dim text-xs font-semibold uppercase tracking-wide">Unread</div>
          </div>
        </div>
        <div className="ml-auto text-sm text-txt-faint">
          Last synced: <span className="text-txt">just now</span>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-5 p-1 bg-bg-2 rounded-xl w-fit">
        {(["All", ...PRIORITY_ORDER] as (Priority | "All")[]).map((f) => (
          <button
            key={f}
            onClick={() => setActiveFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all capitalize ${
              activeFilter === f ? "bg-gold text-[#0f1219]" : "text-txt-dim hover:text-txt"
            }`}
          >
            {f}
            <span className="ml-1.5 text-[10px] opacity-70">
              {f === "All"
                ? active.length
                : active.filter((e) => e.priority === f).length}
            </span>
          </button>
        ))}
      </div>

      {/* Email list */}
      <div className="space-y-5">
        {grouped.length === 0 && (
          <EmptyState
            icon="CheckCircle2"
            title="All caught up!"
            hint="No emails in this category. Nice work."
          />
        )}

        {grouped.map(({ priority, items }) => (
          <div key={priority}>
            {/* Priority group header */}
            <div className="flex items-center gap-2 mb-3">
              <Icon
                name={PRIORITY_CONFIG[priority].icon}
                size={15}
                className={PRIORITY_CONFIG[priority].color}
              />
              <span className="section-label">{priority}</span>
              <span className="tag bg-panel-2 text-txt-faint text-[10px]">{items.length}</span>
            </div>

            <div className="space-y-2">
              {items.map((email) => (
                <div
                  key={email.id}
                  className={`card transition-all ${
                    expandedId === email.id ? "border-gold-bright/30" : ""
                  } ${!email.read ? "border-l-2 border-l-gold-bright" : ""}`}
                >
                  {/* Collapsed row */}
                  <button
                    className="w-full text-left p-4"
                    onClick={() =>
                      setExpandedId(expandedId === email.id ? null : email.id)
                    }
                  >
                    <div className="flex items-start gap-3">
                      {/* Avatar */}
                      <div
                        className={`grid place-items-center w-9 h-9 rounded-full text-[11px] font-bold flex-shrink-0 mt-0.5 ${
                          email.category === "Lead Enquiry"
                            ? "bg-blue text-white"
                            : email.category === "Vendor"
                            ? "bg-purple text-white"
                            : email.category === "Legal"
                            ? "bg-red text-white"
                            : email.category === "Finance"
                            ? "bg-gold text-[#1a1205]"
                            : "bg-panel-2 text-txt-dim"
                        }`}
                      >
                        {initials(email.sender.split(" ").slice(0, 2).join(" "))}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span
                            className={`text-sm font-semibold ${!email.read ? "text-txt" : "text-txt-dim"}`}
                          >
                            {email.sender}
                          </span>
                          <div className="flex items-center gap-2">
                            <Badge tone={CATEGORY_TONE[email.category]}>
                              {email.category}
                            </Badge>
                            <span className="text-[11px] text-txt-faint">
                              {mounted ? timeAgo(email.receivedAt) : ""}
                            </span>
                          </div>
                        </div>
                        <p
                          className={`text-sm mt-0.5 ${!email.read ? "font-medium" : "text-txt-dim"}`}
                        >
                          {email.subject}
                        </p>
                        <p className="text-xs text-txt-faint mt-1 line-clamp-2 leading-relaxed">
                          <Icon name="Sparkles" size={11} className="inline mr-1 text-gold-bright" />
                          {email.summary}
                        </p>
                      </div>

                      {/* Action chip */}
                      <div className="flex-shrink-0 hidden sm:block">
                        <span
                          className={`tag text-[11px] ${
                            email.action === "Reply"
                              ? "bg-[rgba(62,199,141,.14)] text-green"
                              : email.action === "Schedule"
                              ? "bg-gold-soft text-gold-bright"
                              : "bg-panel-2 text-txt-faint"
                          }`}
                        >
                          <Icon
                            name={ACTION_CONFIG[email.action].icon}
                            size={11}
                            className="inline mr-1"
                          />
                          {email.action}
                        </span>
                      </div>

                      <Icon
                        name={expandedId === email.id ? "ChevronUp" : "ChevronDown"}
                        size={16}
                        className="text-txt-faint flex-shrink-0 mt-1"
                      />
                    </div>
                  </button>

                  {/* Expanded detail */}
                  {expandedId === email.id && (
                    <div className="px-4 pb-4 border-t border-line/30 mt-0 pt-4 animate-fade-in">
                      <div className="flex items-center gap-2 text-xs text-txt-faint mb-3">
                        <Icon name="AtSign" size={12} />
                        <span>{email.senderEmail}</span>
                        <span className="mx-1">·</span>
                        <Icon name="Clock" size={12} />
                        <span>{mounted ? new Date(email.receivedAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : ""}</span>
                      </div>

                      {/* AI summary block */}
                      <div className="bg-panel-2 rounded-xl p-4 mb-4">
                        <div className="flex items-center gap-2 text-gold-bright text-xs font-semibold mb-2">
                          <Icon name="Sparkles" size={13} />
                          AI Summary
                        </div>
                        <p className="text-sm text-txt leading-relaxed">{email.summary}</p>
                        <div className="mt-3 pt-3 border-t border-line/30 flex items-center gap-2">
                          <span className="text-xs text-txt-faint font-semibold">Suggested action:</span>
                          <span
                            className={`tag text-[11px] ${
                              email.action === "Reply"
                                ? "bg-[rgba(62,199,141,.14)] text-green"
                                : email.action === "Schedule"
                                ? "bg-gold-soft text-gold-bright"
                                : "bg-panel-2 text-txt-faint"
                            }`}
                          >
                            <Icon
                              name={ACTION_CONFIG[email.action].icon}
                              size={11}
                              className="inline mr-1"
                            />
                            {email.action}
                          </span>
                          <Badge tone={CATEGORY_TONE[email.category]}>{email.category}</Badge>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {email.action === "Reply" && (
                          <button
                            className="btn btn-primary flex items-center gap-1.5 text-sm"
                            onClick={() => handleReply(email)}
                          >
                            <Icon name="Reply" size={14} />
                            Reply
                          </button>
                        )}
                        {email.action === "Schedule" && (
                          <button
                            className="btn btn-primary flex items-center gap-1.5 text-sm"
                            onClick={() => handleSchedule(email)}
                          >
                            <Icon name="Calendar" size={14} />
                            Schedule
                          </button>
                        )}
                        <button
                          onClick={() => markDone(email.id)}
                          className="btn btn-ghost flex items-center gap-1.5 text-sm"
                        >
                          <Icon name="CheckCircle2" size={14} />
                          Mark Done
                        </button>
                        <button
                          onClick={() => archiveEmail(email.id)}
                          className="btn btn-ghost flex items-center gap-1.5 text-sm text-txt-faint"
                        >
                          <Icon name="Archive" size={14} />
                          Archive
                        </button>
                        {email.action === "Reply" && (
                          <button
                            className="btn btn-ghost flex items-center gap-1.5 text-sm text-txt-faint"
                            onClick={() => handleForward(email)}
                          >
                            <Icon name="Forward" size={14} />
                            Forward
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 card p-4 text-sm font-medium shadow-2xl border border-line animate-fade-in">
          {toast}
        </div>
      )}

      {/* Archived section toggle */}
      {emails.some((e) => e.done) && (
        <div className="mt-6">
          <details className="group">
            <summary className="flex items-center gap-2 text-txt-faint text-sm cursor-pointer hover:text-txt transition-colors list-none">
              <Icon name="Archive" size={14} />
              <span>{emails.filter((e) => e.done).length} archived / done</span>
              <Icon name="ChevronDown" size={13} className="group-open:rotate-180 transition-transform" />
            </summary>
            <div className="mt-3 space-y-2">
              {emails
                .filter((e) => e.done)
                .map((email) => (
                  <div key={email.id} className="card p-3 opacity-50">
                    <div className="flex items-center gap-3">
                      <Icon name="CheckCircle2" size={14} className="text-green flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm text-txt-dim line-through truncate block">{email.subject}</span>
                        <span className="text-xs text-txt-faint">{email.sender}</span>
                      </div>
                      <button
                        onClick={() =>
                          setEmails((prev) =>
                            prev.map((e) => (e.id === email.id ? { ...e, done: false } : e))
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
    </div>
  );
}
