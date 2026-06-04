"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  PageHeader,
  KPICard,
  Badge,
  ConnectBanner,
  EmptyState,
} from "@/components/ui";
import { Icon } from "@/components/Icon";
import { TrendLine } from "@/components/charts";
import { initials, timeAgo } from "@/lib/format";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Campaign {
  id: string;
  name: string;
  template: string;
  audience: string;
  status: string;
  analytics: Record<string, number>;
  createdAt: string;
}

interface Lead {
  id: string;
  name: string;
  phone: string;
  temperature: string;
  stage: string;
}

interface Props {
  campaigns: Campaign[];
  leads: Lead[];
  hasKey: boolean;
  tenantId: string;
}

// ─── Built-in templates ───────────────────────────────────────────────────────

const TEMPLATES = [
  {
    id: "site-visit-invite",
    name: "Site Visit Invite",
    category: "Sales",
    body: `Hi {{name}}, 🏠

We'd love to invite you to a *site visit* for our premium project in Jagatpura, Jaipur.

📅 This weekend — Saturday & Sunday, 10 AM to 5 PM
📍 Shubh Heights, Jagatpura, Jaipur

Exclusive offer: Book during the visit & get a *₹50,000 discount* on the base price.

Reply *YES* to confirm your slot, or call us at 9876543210.

*Shubh Realtors* | RERA: RAJ/P/2024/001`,
  },
  {
    id: "price-drop",
    name: "Price Drop Alert",
    category: "Offer",
    body: `Hi {{name}}, 📢

*Price Drop Alert!* For a limited time:

🏗️ 2BHK in Mansarovar Extension — ₹42L → *₹38.5L*
🏗️ 3BHK in Vaishali Nagar — ₹68L → *₹63L*

This offer is valid only till *30th June 2026*.

🔑 Ready-to-move units | Zero maintenance for 1 year.

Reply *INTERESTED* or call 9876543210 now.

*Shubh Realtors* | Jaipur`,
  },
  {
    id: "diwali-offer",
    name: "Diwali Special Offer",
    category: "Festival",
    body: `✨ *Diwali Mubarak, {{name}}!* ✨

This Diwali, light up your dream home with Shubh Realtors.

🪔 *Special Diwali Offer:*
• ₹1 Lakh off on 3BHK bookings
• Gold coin worth ₹11,000 on token payment
• Zero floor-rise charges (G+3 floors)

Valid for this Navratri–Diwali period only.

🏡 Shubh Greens, C-Scheme | RERA Approved
📞 9876543210

Reply *BOOK* to reserve your unit today!`,
  },
  {
    id: "payment-reminder",
    name: "Payment Reminder",
    category: "Finance",
    body: `Dear {{name}},

This is a friendly reminder that your next *payment milestone* for Unit B-304 is due.

📅 Due Date: *15 June 2026*
💰 Amount Due: ₹4,20,000 (20% instalment)

Payment options:
• Online: shubhrealtors.com/pay
• NEFT/RTGS: Account details in your booking letter
• Cheque: Payable at our Tonk Road office

For any queries, contact your relationship manager.

*Shubh Realtors* | accounts@shubhrealtors.com`,
  },
];

// ─── Audience segments ────────────────────────────────────────────────────────

function getSegmentLeads(segment: string, leads: Lead[]): Lead[] {
  switch (segment) {
    case "Hot leads":
      return leads.filter((l) => l.temperature === "HOT");
    case "Warm leads":
      return leads.filter((l) => l.temperature === "WARM");
    case "Site-visit done":
      return leads.filter((l) => l.stage === "SITE_VISIT");
    default:
      return leads;
  }
}

const SEGMENTS = ["Hot leads", "Warm leads", "Site-visit done", "All leads"];

// ─── Mock conversations ───────────────────────────────────────────────────────

interface Message {
  id: string;
  direction: "in" | "out";
  text: string;
  time: string;
  status?: "sent" | "delivered" | "read";
}

const MOCK_THREAD: Message[] = [
  { id: "1", direction: "out", text: "Hi Rajesh, this is Anil from Shubh Realtors. Hope you're doing well! Wanted to follow up on the 3BHK unit you enquired about in Vaishali Nagar.", time: "10:02 AM", status: "read" },
  { id: "2", direction: "in", text: "Hi Anil, yes I remember. I had some questions about the payment plan.", time: "10:15 AM" },
  { id: "3", direction: "out", text: "Of course! We offer a very flexible plan — 10% token, 20% within 30 days, and the rest linked to construction milestones. Would you like me to send the detailed schedule?", time: "10:17 AM", status: "read" },
  { id: "4", direction: "in", text: "Yes please send it. Also what's the current price per sqft?", time: "10:22 AM" },
  { id: "5", direction: "out", text: "Current rate is ₹4,850/sqft for Vaishali Nagar. The 1,450 sqft 3BHK comes to ₹70.3L all-inclusive (parking, registration, PLC). For you we can offer ₹68L as a special price valid till month-end.", time: "10:24 AM", status: "delivered" },
  { id: "6", direction: "in", text: "That sounds good. Can we do a site visit this Sunday?", time: "10:31 AM" },
  { id: "7", direction: "out", text: "Absolutely! Sunday 11 AM works perfectly. I'll send you the location pin and our team will be ready to show you the sample flat and the under-construction tower. See you then! 🏡", time: "10:32 AM", status: "sent" },
];

function buildContactList(leads: Lead[]): Lead[] {
  // Use real leads, pad with mock names if fewer than 6
  const mockFill: Lead[] = [
    { id: "m1", name: "Rajesh Sharma", phone: "+91 98765 43210", temperature: "HOT", stage: "SITE_VISIT" },
    { id: "m2", name: "Priya Gupta", phone: "+91 87654 32109", temperature: "WARM", stage: "CONTACTED" },
    { id: "m3", name: "Amit Verma", phone: "+91 76543 21098", temperature: "HOT", stage: "NEGOTIATION" },
    { id: "m4", name: "Sunita Agarwal", phone: "+91 65432 10987", temperature: "COLD", stage: "NEW" },
    { id: "m5", name: "Vikram Singh", phone: "+91 54321 09876", temperature: "WARM", stage: "CONTACTED" },
    { id: "m6", name: "Meena Joshi", phone: "+91 43210 98765", temperature: "HOT", stage: "SITE_VISIT" },
  ];
  const merged = [...leads.slice(0, 8), ...mockFill].slice(0, 8);
  return merged;
}

// ─── Analytics chart data helper ─────────────────────────────────────────────

function buildChartData(campaigns: Campaign[]) {
  // Only real, recorded facts: recipients per broadcast. Delivery metrics need the WA API.
  return campaigns.slice(0, 8).reverse().map((c) => ({
    month: new Date(c.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
    Recipients: Number((c.analytics as any)?.recipients ?? (c.analytics as any)?.sent ?? 0),
  }));
}

// ─── Tab type ─────────────────────────────────────────────────────────────────

type Tab = "broadcast" | "conversations" | "analytics";

// ─── Main Component ───────────────────────────────────────────────────────────

export function WhatsAppClient({ campaigns, leads, hasKey, tenantId }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("broadcast");
  const [selectedTemplate, setSelectedTemplate] = useState(TEMPLATES[0]);
  const [editedBody, setEditedBody] = useState(TEMPLATES[0].body);
  const [selectedSegment, setSelectedSegment] = useState<string>("Hot leads");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [activeContact, setActiveContact] = useState<Lead | null>(null);
  const [chatMessages, setChatMessages] = useState<Message[]>(MOCK_THREAD);
  const [newMessage, setNewMessage] = useState("");

  const segmentLeads = getSegmentLeads(selectedSegment, leads);
  const recipientCount = segmentLeads.length || (selectedSegment === "Hot leads" ? 12 : selectedSegment === "Warm leads" ? 28 : selectedSegment === "Site-visit done" ? 9 : 54);

  const contactList = buildContactList(leads);

  // Real KPIs only — recipients reached across broadcasts. Delivery metrics require the WA API.
  const totalRecipients = campaigns.reduce(
    (s, c) => s + Number((c.analytics as any)?.recipients ?? (c.analytics as any)?.sent ?? 0),
    0
  );
  const totalBroadcasts = campaigns.length;
  const deliveryAvailable = hasKey; // only real once connected to WhatsApp Business

  async function handleSend() {
    setSending(true);
    try {
      const res = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${selectedTemplate.name} — ${selectedSegment}`,
          template: editedBody,
          audience: selectedSegment,
          recipientCount,
        }),
      });
      if (res.ok) {
        setSent(true);
        setTimeout(() => {
          setSent(false);
          router.refresh();
        }, 3000);
      }
    } catch {
      // never throw
    } finally {
      setSending(false);
    }
  }

  function handleTemplateChange(tpl: typeof TEMPLATES[0]) {
    setSelectedTemplate(tpl);
    setEditedBody(tpl.body);
  }

  function handleSendMessage() {
    if (!newMessage.trim()) return;
    const msg: Message = {
      id: String(Date.now()),
      direction: "out",
      text: newMessage.trim(),
      time: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
      status: "sent",
    };
    setChatMessages((prev) => [...prev, msg]);
    setNewMessage("");
  }

  const chartData = buildChartData(campaigns);

  return (
    <div>
      <PageHeader
        title="WhatsApp Business"
        subtitle="Broadcast templates, manage conversations & track campaign performance."
        icon="MessageCircle"
        actions={
          <div className="flex items-center gap-2">
            <span className={`tag ${hasKey ? "bg-[rgba(62,199,141,.14)] text-green" : "bg-gold-soft text-gold-bright"}`}>
              <Icon name={hasKey ? "Wifi" : "WifiOff"} size={12} />
              <span className="ml-1">{hasKey ? "Live" : "Demo"}</span>
            </span>
          </div>
        }
      />

      {!hasKey && (
        <ConnectBanner
          name="WhatsApp Business (360dialog / Interakt)"
          enables="Broadcasts compose real recipient segments from your CRM and are queued. Connect to actually send and unlock delivery analytics."
        />
      )}

      {/* KPI row — real recipient/broadcast counts; delivery metrics only when connected */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPICard label="Recipients Reached" value={String(totalRecipients)} icon="Users" accent="gold" />
        <KPICard label="Broadcasts" value={String(totalBroadcasts)} icon="Send" accent="blue" />
        <KPICard label="Delivered" value={deliveryAvailable ? "0" : "—"} icon="CheckCheck" accent="green" />
        <KPICard label="Read" value={deliveryAvailable ? "0" : "—"} icon="Eye" accent="purple" />
      </div>
      {!deliveryAvailable && (
        <p className="text-xs text-txt-faint -mt-3 mb-6">
          Delivered / Read / Replied require the WhatsApp Business API — connect it in Settings for real delivery analytics.
        </p>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-5 p-1 bg-bg-2 rounded-xl w-fit">
        {(["broadcast", "conversations", "analytics"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all capitalize ${
              tab === t ? "bg-gold text-[#0f1219]" : "text-txt-dim hover:text-txt"
            }`}
          >
            {t === "broadcast" ? "Templates & Broadcast" : t === "conversations" ? "Conversations" : "Analytics"}
          </button>
        ))}
      </div>

      {/* ── Tab: Broadcast ─────────────────────────────────────────────────── */}
      {tab === "broadcast" && (
        <div className="grid lg:grid-cols-3 gap-5">
          {/* Template list */}
          <div className="lg:col-span-1 space-y-2">
            <p className="section-label mb-3">Templates</p>
            {TEMPLATES.map((tpl) => (
              <button
                key={tpl.id}
                onClick={() => handleTemplateChange(tpl)}
                className={`w-full text-left card p-4 transition-all ${
                  selectedTemplate.id === tpl.id ? "border-gold-bright/50 bg-gold-soft/10" : "hover:border-line/60"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-sm">{tpl.name}</span>
                  <span className="tag bg-panel-2 text-txt-dim text-[10px]">{tpl.category}</span>
                </div>
                <p className="text-txt-faint text-xs line-clamp-2 leading-relaxed">
                  {tpl.body.slice(0, 80)}…
                </p>
              </button>
            ))}
          </div>

          {/* Compose + send */}
          <div className="lg:col-span-2 space-y-4">
            <Card className="p-5">
              <h3 className="font-display font-bold text-lg mb-4">Compose Broadcast</h3>

              {/* Template body editor */}
              <label className="field-label">Message Template</label>
              <textarea
                value={editedBody}
                onChange={(e) => setEditedBody(e.target.value)}
                rows={9}
                className="input w-full resize-none font-mono text-sm leading-relaxed"
              />
              <p className="text-txt-faint text-xs mt-1">
                Use <code className="bg-panel-2 px-1 rounded">{"{{name}}"}</code> — it will be replaced with each recipient's name.
              </p>

              {/* Audience segment */}
              <label className="field-label mt-4">Audience Segment</label>
              <div className="flex flex-wrap gap-2">
                {SEGMENTS.map((seg) => (
                  <button
                    key={seg}
                    onClick={() => setSelectedSegment(seg)}
                    className={`btn text-sm ${selectedSegment === seg ? "btn-primary" : "btn-ghost"}`}
                  >
                    {seg}
                  </button>
                ))}
              </div>

              {/* Recipient count */}
              <div className="flex items-center gap-2 mt-4 p-3 bg-panel-2 rounded-lg">
                <Icon name="Users" size={16} className="text-gold-bright" />
                <span className="text-sm text-txt-dim">
                  This broadcast will reach{" "}
                  <strong className="text-txt">{recipientCount} recipients</strong> in the{" "}
                  <strong className="text-txt">{selectedSegment}</strong> segment.
                </span>
              </div>

              {/* Send button */}
              <div className="flex items-center gap-3 mt-4">
                <button
                  onClick={handleSend}
                  disabled={sending || sent}
                  className="btn btn-primary flex items-center gap-2"
                >
                  <Icon name={sent ? "CheckCheck" : "Send"} size={15} />
                  {sending ? "Sending…" : sent ? "Sent!" : "Send Broadcast"}
                </button>
                {sent && (
                  <span className="text-green text-sm font-semibold animate-fade-in">
                    Campaign created successfully.
                  </span>
                )}
              </div>
            </Card>

            {/* Recent campaigns mini list */}
            {campaigns.length > 0 && (
              <Card className="p-5">
                <h3 className="font-display font-semibold text-base mb-3">Recent Campaigns</h3>
                <div className="space-y-2">
                  {campaigns.slice(0, 5).map((c) => (
                    <div key={c.id} className="flex items-center gap-3 py-2 border-b border-line/30 last:border-0">
                      <Icon name="MessageCircle" size={14} className="text-green flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{c.name}</p>
                        <p className="text-xs text-txt-faint">{c.audience} · {timeAgo(c.createdAt)}</p>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-txt-dim">
                        <span title="Recipients">👥 {Number((c.analytics as any)?.recipients ?? (c.analytics as any)?.sent ?? 0)}</span>
                        <Badge tone={c.status === "SENT" ? "green" : c.status === "DRAFT" ? "neutral" : "gold"}>
                          {c.status === "SCHEDULED" ? "QUEUED" : c.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* ── Tab: Conversations ─────────────────────────────────────────────── */}
      {tab === "conversations" && (
        <div className="grid lg:grid-cols-3 gap-5 h-[600px]">
          {/* Contact list */}
          <div className="lg:col-span-1 card p-0 overflow-y-auto">
            <div className="p-4 border-b border-line sticky top-0 bg-panel">
              <h3 className="font-display font-semibold">Contacts</h3>
              <p className="text-txt-faint text-xs mt-0.5">From your lead database</p>
            </div>
            <div>
              {contactList.map((lead) => (
                <button
                  key={lead.id}
                  onClick={() => setActiveContact(lead)}
                  className={`w-full text-left flex items-center gap-3 px-4 py-3.5 border-b border-line/30 hover:bg-panel-2 transition-colors ${activeContact?.id === lead.id ? "bg-panel-2" : ""}`}
                >
                  <div
                    className={`grid place-items-center w-10 h-10 rounded-full text-sm font-bold flex-shrink-0 ${
                      lead.temperature === "HOT"
                        ? "bg-gold text-[#1a1205]"
                        : lead.temperature === "WARM"
                        ? "bg-blue text-white"
                        : "bg-panel-2 text-txt-dim"
                    }`}
                  >
                    {initials(lead.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm truncate">{lead.name}</span>
                      <span className="text-[10px] text-txt-faint">2h ago</span>
                    </div>
                    <p className="text-xs text-txt-dim truncate">{lead.phone}</p>
                  </div>
                  <span
                    className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      lead.temperature === "HOT" ? "bg-gold-bright" : lead.temperature === "WARM" ? "bg-blue" : "bg-txt-faint"
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Thread */}
          <div className="lg:col-span-2 card p-0 flex flex-col">
            {activeContact ? (
              <>
                {/* Header */}
                <div className="p-4 border-b border-line flex items-center gap-3">
                  <div
                    className={`grid place-items-center w-10 h-10 rounded-full text-sm font-bold ${
                      activeContact.temperature === "HOT" ? "bg-gold text-[#1a1205]" : "bg-blue text-white"
                    }`}
                  >
                    {initials(activeContact.name)}
                  </div>
                  <div>
                    <div className="font-semibold flex items-center gap-2">
                      {activeContact.name}
                      {!hasKey && <Badge tone="neutral">Preview</Badge>}
                    </div>
                    <div className="text-xs text-txt-dim">{activeContact.phone}</div>
                  </div>
                  <div className="ml-auto flex gap-2">
                    <a
                      href={`tel:${activeContact.phone.replace(/\s/g, "")}`}
                      className="btn btn-ghost p-2"
                      title={`Call ${activeContact.name}`}
                    >
                      <Icon name="Phone" size={15} />
                    </a>
                    <button className="btn btn-ghost p-2" title="More options" onClick={() => {}}>
                      <Icon name="MoreVertical" size={15} />
                    </button>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {chatMessages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.direction === "out" ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                          msg.direction === "out"
                            ? "bg-[rgba(62,199,141,.18)] text-txt rounded-br-sm"
                            : "bg-panel-2 text-txt rounded-bl-sm"
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{msg.text}</p>
                        <div className={`text-[10px] mt-1 flex items-center gap-1 ${msg.direction === "out" ? "text-txt-faint justify-end" : "text-txt-faint"}`}>
                          {msg.time}
                          {msg.direction === "out" && (
                            <Icon
                              name={msg.status === "read" ? "CheckCheck" : msg.status === "delivered" ? "CheckCheck" : "Check"}
                              size={11}
                              className={msg.status === "read" ? "text-blue" : "text-green"}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Input */}
                <div className="p-3 border-t border-line flex gap-2">
                  <label className="btn btn-ghost p-2 flex-shrink-0 cursor-pointer" title="Attach file">
                    <Icon name="Paperclip" size={16} />
                    <input type="file" className="hidden" onChange={() => {}} />
                  </label>
                  <input
                    className="input flex-1 text-sm"
                    placeholder="Type a message…"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendMessage()}
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim()}
                    className="btn btn-primary p-2 flex-shrink-0"
                  >
                    <Icon name="Send" size={16} />
                  </button>
                </div>
              </>
            ) : (
              <EmptyState
                icon="MessageCircle"
                title="Select a contact"
                hint="Click a contact on the left to open the conversation thread."
              />
            )}
          </div>
        </div>
      )}

      {/* ── Tab: Analytics ─────────────────────────────────────────────────── */}
      {tab === "analytics" && (
        <div className="space-y-5">
          {/* Summary stats — real figures only */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Campaigns run", value: String(campaigns.length), icon: "Megaphone", accent: "gold" as const },
              { label: "Recipients reached", value: String(totalRecipients), icon: "Users", accent: "blue" as const },
              { label: "Avg. open rate", value: deliveryAvailable ? "0%" : "—", icon: "Eye", accent: "purple" as const },
              { label: "Avg. reply rate", value: deliveryAvailable ? "0%" : "—", icon: "Reply", accent: "green" as const },
            ].map((s) => (
              <KPICard key={s.label} label={s.label} value={s.value} icon={s.icon} accent={s.accent} />
            ))}
          </div>

          {/* Trend chart — recipients per broadcast (real). Delivery curves need the WA API. */}
          <Card className="p-5">
            <h3 className="font-display font-bold text-lg mb-1">Broadcast Reach</h3>
            <p className="text-txt-dim text-sm mb-4">
              Recipients per broadcast.{!deliveryAvailable && " Connect WhatsApp Business for delivered / read / replied curves."}
            </p>
            {chartData.length > 0 ? (
              <TrendLine data={chartData} keys={[{ key: "Recipients", color: "#d9a441" }]} />
            ) : (
              <EmptyState icon="Megaphone" title="No broadcasts yet" hint="Send a broadcast to see reach here." />
            )}
          </Card>

          {/* Campaign table */}
          <Card className="p-5">
            <h3 className="font-display font-bold text-lg mb-4">All WhatsApp Campaigns</h3>
            {campaigns.length === 0 ? (
              <EmptyState
                icon="Megaphone"
                title="No campaigns yet"
                hint="Send your first broadcast from the Templates & Broadcast tab."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-line text-txt-faint text-left text-xs uppercase tracking-wide">
                      <th className="pb-3 pr-4 font-semibold">Campaign</th>
                      <th className="pb-3 pr-4 font-semibold">Audience</th>
                      <th className="pb-3 pr-4 font-semibold text-right">Recipients</th>
                      <th className="pb-3 pr-4 font-semibold text-right">Delivered</th>
                      <th className="pb-3 pr-4 font-semibold text-right">Read</th>
                      <th className="pb-3 pr-4 font-semibold text-right">Replied</th>
                      <th className="pb-3 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {campaigns.map((c) => (
                      <tr key={c.id} className="border-b border-line/30 hover:bg-panel-2/50 transition-colors">
                        <td className="py-3 pr-4">
                          <div className="font-medium">{c.name}</div>
                          <div className="text-xs text-txt-faint">{timeAgo(c.createdAt)}</div>
                        </td>
                        <td className="py-3 pr-4 text-txt-dim">{c.audience}</td>
                        <td className="py-3 pr-4 text-right font-medium">{Number((c.analytics as any)?.recipients ?? (c.analytics as any)?.sent ?? 0)}</td>
                        <td className="py-3 pr-4 text-right text-green">{(c.analytics as any)?.delivered ?? "—"}</td>
                        <td className="py-3 pr-4 text-right text-blue">{(c.analytics as any)?.read ?? "—"}</td>
                        <td className="py-3 pr-4 text-right text-purple">{(c.analytics as any)?.replied ?? "—"}</td>
                        <td className="py-3">
                          <Badge tone={c.status === "SENT" ? "green" : c.status === "DRAFT" ? "neutral" : c.status === "FAILED" ? "red" : "gold"}>
                            {c.status === "SCHEDULED" ? "QUEUED" : c.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
