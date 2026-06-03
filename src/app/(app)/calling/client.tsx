"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card, PageHeader, Badge, ConnectBanner, EmptyState } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { initials, timeAgo } from "@/lib/format";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Lead {
  id: string;
  name: string;
  phone: string;
  temperature: string;
  stage: string;
  assignedToId: string | null;
  nextFollowUp: string | null;
  notes: string | null;
}

interface CallLogEntry {
  id: string;
  userId: string | null;
  leadName: string;
  phone: string;
  direction: string;
  disposition: string;
  durationSec: number;
  recordingUrl: string | null;
  notes: string | null;
  createdAt: string;
  user: { id: string; name: string; avatarColor: string } | null;
}

interface TeamMember {
  id: string;
  name: string;
  avatarColor: string;
}

interface Props {
  leads: Lead[];
  callLogs: CallLogEntry[];
  dailyTarget: number;
  teamMembers: TeamMember[];
  currentUser: { id: string; name: string; role: string };
  tenantId: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DISPOSITIONS = [
  { value: "CONNECTED", label: "Connected", icon: "PhoneCall", color: "text-green" },
  { value: "NO_ANSWER", label: "No Answer", icon: "PhoneOff", color: "text-txt-dim" },
  { value: "BUSY", label: "Busy", icon: "PhoneMissed", color: "text-gold-bright" },
  { value: "CALLBACK", label: "Callback Later", icon: "PhoneIncoming", color: "text-blue" },
  { value: "WRONG_NUMBER", label: "Wrong Number", icon: "PhoneX", color: "text-red" },
] as const;

const TEMP_COLORS: Record<string, string> = {
  HOT: "tag-hot",
  WARM: "tag-warm",
  COLD: "tag-cold",
};

const DISP_TONE: Record<string, "green" | "neutral" | "gold" | "blue" | "red"> = {
  CONNECTED: "green",
  NO_ANSWER: "neutral",
  BUSY: "gold",
  CALLBACK: "blue",
  WRONG_NUMBER: "red",
};

function fmtDuration(sec: number): string {
  if (!sec) return "—";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

// ─── Disposition Modal ────────────────────────────────────────────────────────

function DispositionModal({
  lead,
  onClose,
  onSubmit,
}: {
  lead: Lead;
  onClose: () => void;
  onSubmit: (data: {
    leadName: string;
    phone: string;
    disposition: string;
    durationSec: number;
    notes: string;
  }) => Promise<void>;
}) {
  const [disposition, setDisposition] = useState("CONNECTED");
  const [duration, setDuration] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit() {
    setSaving(true);
    setError("");
    try {
      await onSubmit({
        leadName: lead.name,
        phone: lead.phone,
        disposition,
        durationSec: duration ? Number(duration) : 0,
        notes,
      });
      onClose();
    } catch {
      setError("Failed to log call. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-bg rounded-[16px] border border-line w-full max-w-md p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display font-bold text-xl">Log Call</h3>
          <button onClick={onClose} className="btn btn-ghost p-2 rounded-lg">
            <Icon name="X" size={18} />
          </button>
        </div>

        {/* Lead info */}
        <div className="flex items-center gap-3 card p-3 mb-5">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-[13px] font-bold text-[#1a1205] flex-shrink-0"
            style={{ background: "#d9a441" }}
          >
            {initials(lead.name)}
          </div>
          <div>
            <div className="font-semibold">{lead.name}</div>
            <div className="text-sm text-txt-dim font-mono">{lead.phone}</div>
          </div>
          <span className={`tag ${TEMP_COLORS[lead.temperature]} ml-auto`}>{lead.temperature}</span>
        </div>

        {/* Disposition select */}
        <div className="mb-4">
          <label className="field-label">Call Outcome</label>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {DISPOSITIONS.map((d) => (
              <button
                key={d.value}
                onClick={() => setDisposition(d.value)}
                className={`flex items-center gap-2 p-2.5 rounded-xl border text-sm transition-all ${
                  disposition === d.value
                    ? "border-gold bg-gold-soft"
                    : "border-line hover:border-gold/40"
                }`}
              >
                <Icon name={d.icon} size={15} className={d.color} />
                <span>{d.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Duration */}
        <div className="mb-4">
          <label className="field-label">Duration (seconds)</label>
          <input
            className="input w-full"
            type="number"
            min="0"
            placeholder="e.g. 120"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
          />
        </div>

        {/* Notes */}
        <div className="mb-5">
          <label className="field-label">Notes</label>
          <textarea
            className="input w-full resize-none"
            rows={3}
            placeholder="What was discussed? Any follow-up needed?"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        {error && <p className="text-red text-sm mb-3">{error}</p>}

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="btn btn-ghost">Cancel</button>
          <button onClick={handleSubmit} disabled={saving} className="btn btn-primary gap-2">
            {saving ? <Icon name="Loader2" size={15} className="animate-spin" /> : <Icon name="Phone" size={15} />}
            {saving ? "Saving…" : "Log Call"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function CallingClient({
  leads,
  callLogs: initialCallLogs,
  dailyTarget,
  teamMembers,
  currentUser,
  tenantId,
}: Props) {
  const router = useRouter();
  const [callLogs, setCallLogs] = useState<CallLogEntry[]>(initialCallLogs);
  const [activeCall, setActiveCall] = useState<Lead | null>(null);
  const [tab, setTab] = useState<"queue" | "log">("queue");
  const [filterTemp, setFilterTemp] = useState<string>("ALL");

  // Today's stats
  const myCallsToday = callLogs.filter((c) => c.userId === currentUser.id);
  const callsMade = myCallsToday.length;
  const connects = myCallsToday.filter((c) => c.disposition === "CONNECTED").length;
  const callbacks = myCallsToday.filter((c) => c.disposition === "CALLBACK").length;
  const connectRate = callsMade > 0 ? Math.round((connects / callsMade) * 100) : 0;
  const targetProgress = Math.min(100, (callsMade / dailyTarget) * 100);

  // Leaderboard
  const leaderboard = useMemo(() => {
    const map = new Map<string, { calls: number; connects: number; member: TeamMember }>();
    for (const m of teamMembers) {
      map.set(m.id, { calls: 0, connects: 0, member: m });
    }
    for (const log of callLogs) {
      if (log.userId && map.has(log.userId)) {
        const entry = map.get(log.userId)!;
        entry.calls += 1;
        if (log.disposition === "CONNECTED") entry.connects += 1;
      }
    }
    return [...map.values()]
      .sort((a, b) => b.calls - a.calls)
      .filter((e) => e.calls > 0)
      .slice(0, 5);
  }, [callLogs, teamMembers]);

  const filteredLeads = filterTemp === "ALL" ? leads : leads.filter((l) => l.temperature === filterTemp);

  async function handleLogCall(data: {
    leadName: string;
    phone: string;
    disposition: string;
    durationSec: number;
    notes: string;
  }) {
    const res = await fetch("/api/calls", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to log call");
    const newLog = await res.json();
    setCallLogs((prev) => [
      {
        ...newLog,
        user: { id: currentUser.id, name: currentUser.name, avatarColor: "#d9a441" },
      },
      ...prev,
    ]);
    router.refresh();
  }

  return (
    <div>
      <PageHeader
        title="Sales Calling"
        subtitle="Your call-center workspace — work the queue, log dispositions, hit targets."
        icon="PhoneCall"
      />

      {/* Connect Banner */}
      <ConnectBanner
        name="Exotel / MyOperator"
        enables="Connect a telephony provider for real click-to-call, IVR routing, and auto-recorded calls."
      />

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="card p-4">
          <div className="text-xs uppercase tracking-wide text-txt-faint font-semibold mb-1">Calls Today</div>
          <div className="font-display text-2xl font-bold">{callsMade}</div>
          <div className="text-xs text-txt-dim mt-1">of {dailyTarget} target</div>
        </div>
        <div className="card p-4">
          <div className="text-xs uppercase tracking-wide text-txt-faint font-semibold mb-1">Connects</div>
          <div className="font-display text-2xl font-bold text-green">{connects}</div>
          <div className="text-xs text-txt-dim mt-1">{connectRate}% connect rate</div>
        </div>
        <div className="card p-4">
          <div className="text-xs uppercase tracking-wide text-txt-faint font-semibold mb-1">Callbacks</div>
          <div className="font-display text-2xl font-bold text-blue">{callbacks}</div>
          <div className="text-xs text-txt-dim mt-1">scheduled</div>
        </div>
        <div className="card p-4">
          <div className="text-xs uppercase tracking-wide text-txt-faint font-semibold mb-1">Queue</div>
          <div className="font-display text-2xl font-bold text-gold-bright">{leads.length}</div>
          <div className="text-xs text-txt-dim mt-1">leads to call</div>
        </div>
      </div>

      {/* Daily target progress bar */}
      <Card className="p-5 mb-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-display font-semibold text-base">Daily Target Progress</h3>
          <span className="text-sm font-semibold text-gold-bright">
            {callsMade} / {dailyTarget} calls
          </span>
        </div>
        <div className="h-3 rounded-full bg-bg-2 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-gold to-gold-bright transition-all duration-700"
            style={{ width: `${targetProgress}%` }}
          />
        </div>
        <div className="flex justify-between mt-1.5 text-xs text-txt-faint">
          <span>0</span>
          <span className={targetProgress >= 100 ? "text-green font-semibold" : ""}>
            {targetProgress >= 100 ? "Target Achieved!" : `${Math.round(targetProgress)}%`}
          </span>
          <span>{dailyTarget}</span>
        </div>
      </Card>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main area — Queue + Log */}
        <div className="lg:col-span-2 space-y-4">
          {/* Tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setTab("queue")}
              className={`btn gap-2 ${tab === "queue" ? "btn-primary" : "btn-ghost"}`}
            >
              <Icon name="ListOrdered" size={15} /> Call Queue ({filteredLeads.length})
            </button>
            <button
              onClick={() => setTab("log")}
              className={`btn gap-2 ${tab === "log" ? "btn-primary" : "btn-ghost"}`}
            >
              <Icon name="History" size={15} /> Today's Log ({callLogs.length})
            </button>
          </div>

          {/* Queue */}
          {tab === "queue" && (
            <Card className="p-5">
              {/* Filter */}
              <div className="flex items-center gap-2 mb-4 flex-wrap">
                {["ALL", "HOT", "WARM", "COLD"].map((t) => (
                  <button
                    key={t}
                    onClick={() => setFilterTemp(t)}
                    className={`btn btn-ghost py-1 px-3 text-xs ${
                      filterTemp === t ? "border-gold text-gold-bright" : ""
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              {filteredLeads.length === 0 ? (
                <EmptyState
                  icon="Phone"
                  title="No leads in queue"
                  hint="Great work — you've cleared your call queue for today!"
                />
              ) : (
                <div className="space-y-2">
                  {filteredLeads.map((lead) => {
                    const lastCall = callLogs.find(
                      (c) => c.phone === lead.phone
                    );
                    return (
                      <div
                        key={lead.id}
                        className="flex items-center gap-3 p-3 rounded-xl border border-line hover:border-gold/30 transition-all"
                      >
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-bold text-[#1a1205] flex-shrink-0"
                          style={{ background: "#d9a441" }}
                        >
                          {initials(lead.name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm">{lead.name}</span>
                            <span className={`tag text-[10px] ${TEMP_COLORS[lead.temperature]}`}>
                              {lead.temperature}
                            </span>
                            <span className="tag bg-panel-2 text-txt-dim text-[10px]">
                              {lead.stage.replace(/_/g, " ")}
                            </span>
                          </div>
                          <div className="text-xs text-txt-dim font-mono mt-0.5">{lead.phone}</div>
                          {lastCall && (
                            <div className="flex items-center gap-1 mt-0.5">
                              <Icon name="Clock" size={10} className="text-txt-faint" />
                              <span className="text-[10px] text-txt-faint">
                                Last: {lastCall.disposition} · {timeAgo(lastCall.createdAt)}
                              </span>
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => setActiveCall(lead)}
                          className="btn btn-primary py-1.5 px-3 text-xs gap-1.5 flex-shrink-0"
                        >
                          <Icon name="Phone" size={13} />
                          Call
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          )}

          {/* Log */}
          {tab === "log" && (
            <Card className="p-5">
              {callLogs.length === 0 ? (
                <EmptyState
                  icon="History"
                  title="No calls logged today"
                  hint="Start making calls from the queue and log your dispositions here."
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-line">
                        <th className="text-left py-2 pr-4 text-xs text-txt-faint font-semibold uppercase tracking-wide">Lead</th>
                        <th className="text-left py-2 pr-4 text-xs text-txt-faint font-semibold uppercase tracking-wide">Agent</th>
                        <th className="text-left py-2 pr-4 text-xs text-txt-faint font-semibold uppercase tracking-wide">Outcome</th>
                        <th className="text-left py-2 pr-4 text-xs text-txt-faint font-semibold uppercase tracking-wide">Duration</th>
                        <th className="text-left py-2 pr-4 text-xs text-txt-faint font-semibold uppercase tracking-wide">Recording</th>
                        <th className="text-left py-2 text-xs text-txt-faint font-semibold uppercase tracking-wide">Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {callLogs.slice(0, 50).map((log) => (
                        <tr key={log.id} className="border-b border-line/40 hover:bg-panel/50 transition-colors">
                          <td className="py-2 pr-4">
                            <div className="font-medium">{log.leadName}</div>
                            <div className="text-xs text-txt-faint font-mono">{log.phone}</div>
                          </td>
                          <td className="py-2 pr-4">
                            {log.user ? (
                              <div className="flex items-center gap-1.5">
                                <div
                                  className="w-6 h-6 rounded-full text-[10px] font-bold flex items-center justify-center text-[#1a1205]"
                                  style={{ background: log.user.avatarColor }}
                                >
                                  {initials(log.user.name)}
                                </div>
                                <span className="text-xs">{log.user.name.split(" ")[0]}</span>
                              </div>
                            ) : (
                              <span className="text-txt-faint text-xs">—</span>
                            )}
                          </td>
                          <td className="py-2 pr-4">
                            <Badge tone={DISP_TONE[log.disposition] ?? "neutral"}>
                              {log.disposition.replace(/_/g, " ")}
                            </Badge>
                          </td>
                          <td className="py-2 pr-4 text-txt-dim text-xs font-mono">
                            {fmtDuration(log.durationSec)}
                          </td>
                          <td className="py-2 pr-4">
                            {log.recordingUrl ? (
                              <a
                                href={log.recordingUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-gold-bright hover:text-gold transition-colors"
                              >
                                <Icon name="Play" size={14} />
                              </a>
                            ) : (
                              <span className="text-txt-faint">
                                <Icon name="Mic" size={13} />
                              </span>
                            )}
                          </td>
                          <td className="py-2 text-xs text-txt-faint">{timeAgo(log.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          )}
        </div>

        {/* Right column — Leaderboard */}
        <div className="space-y-4">
          <Card className="p-5">
            <h3 className="font-display font-bold text-base mb-4">
              <span className="flex items-center gap-2">
                <Icon name="Trophy" size={16} className="text-gold-bright" />
                Today's Leaderboard
              </span>
            </h3>

            {leaderboard.length === 0 ? (
              <p className="text-txt-dim text-sm text-center py-4">No calls logged yet today.</p>
            ) : (
              <div className="space-y-3">
                {leaderboard.map((entry, i) => {
                  const connRate = entry.calls > 0
                    ? Math.round((entry.connects / entry.calls) * 100)
                    : 0;
                  const medals = ["🥇", "🥈", "🥉"];
                  return (
                    <div key={entry.member.id} className="flex items-center gap-3">
                      <span className="text-base w-6 text-center">{medals[i] ?? `${i + 1}.`}</span>
                      <div
                        className="w-8 h-8 rounded-full text-[11px] font-bold flex items-center justify-center text-[#1a1205] flex-shrink-0"
                        style={{ background: entry.member.avatarColor }}
                      >
                        {initials(entry.member.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold truncate">{entry.member.name}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <div className="h-1.5 flex-1 rounded-full bg-bg-2 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-gold to-gold-bright"
                              style={{
                                width: `${Math.min(100, (entry.calls / dailyTarget) * 100)}%`,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-sm font-bold text-gold-bright">{entry.calls}</div>
                        <div className="text-[10px] text-txt-faint">{connRate}% conn</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Quick stats */}
          <Card className="p-5">
            <h3 className="font-display font-semibold text-base mb-3">Team Totals Today</h3>
            <div className="space-y-2">
              {[
                {
                  label: "Total Calls",
                  value: callLogs.length,
                  icon: "Phone",
                  color: "text-gold-bright",
                },
                {
                  label: "Connected",
                  value: callLogs.filter((c) => c.disposition === "CONNECTED").length,
                  icon: "PhoneCall",
                  color: "text-green",
                },
                {
                  label: "Callbacks",
                  value: callLogs.filter((c) => c.disposition === "CALLBACK").length,
                  icon: "PhoneIncoming",
                  color: "text-blue",
                },
                {
                  label: "No Answer",
                  value: callLogs.filter((c) => c.disposition === "NO_ANSWER").length,
                  icon: "PhoneOff",
                  color: "text-txt-dim",
                },
              ].map((stat) => (
                <div key={stat.label} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-txt-dim">
                    <Icon name={stat.icon} size={13} className={stat.color} />
                    {stat.label}
                  </div>
                  <span className={`font-bold ${stat.color}`}>{stat.value}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Tips */}
          <Card className="p-5 border border-gold/20">
            <div className="flex items-center gap-2 mb-2">
              <Icon name="Lightbulb" size={15} className="text-gold-bright" />
              <h3 className="font-semibold text-sm">Calling Tips</h3>
            </div>
            <ul className="text-xs text-txt-dim space-y-1.5">
              <li>• Call HOT leads within 5 minutes of creation</li>
              <li>• Best time: 10–11 AM and 3–5 PM</li>
              <li>• Always log disposition — even no-answers count</li>
              <li>• 5+ touches needed before a warm lead converts</li>
            </ul>
          </Card>
        </div>
      </div>

      {/* Disposition Modal */}
      {activeCall && (
        <DispositionModal
          lead={activeCall}
          onClose={() => setActiveCall(null)}
          onSubmit={handleLogCall}
        />
      )}
    </div>
  );
}
