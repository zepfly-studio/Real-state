"use client";

import { useState, useEffect } from "react";
import { Card, PageHeader, Badge, ConnectBanner, EmptyState } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { initials, timeAgo } from "@/lib/format";

// ─── Types ────────────────────────────────────────────────────────────────────

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

interface IvrNode {
  id: string;
  type: "greeting" | "menu" | "route" | "hangup";
  label: string;
  options?: { key: string; label: string }[];
  routeTo?: string;
}

interface Props {
  hasExotel: boolean;
  hasMyoperator: boolean;
  recentCalls: CallLogEntry[];
  tenantId: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_IVR_FLOW: IvrNode[] = [
  {
    id: "1",
    type: "greeting",
    label: "Welcome to Shubh Realtors! Thank you for calling.",
  },
  {
    id: "2",
    type: "menu",
    label: "Press 1 for Sales, Press 2 for Site Visits, Press 3 for Support",
    options: [
      { key: "1", label: "Sales Team" },
      { key: "2", label: "Site Visit Booking" },
      { key: "3", label: "Customer Support" },
    ],
  },
  {
    id: "3",
    type: "route",
    label: "Route to Available Agent",
    routeTo: "Sales Queue",
  },
  {
    id: "4",
    type: "hangup",
    label: "Thank you for calling. Goodbye!",
  },
];

const NODE_ICONS: Record<IvrNode["type"], string> = {
  greeting: "Mic",
  menu: "Hash",
  route: "GitMerge",
  hangup: "PhoneOff",
};

const NODE_COLORS: Record<IvrNode["type"], string> = {
  greeting: "text-gold-bright",
  menu: "text-blue",
  route: "text-green",
  hangup: "text-red",
};

const NODE_BG: Record<IvrNode["type"], string> = {
  greeting: "bg-gold-soft",
  menu: "bg-[rgba(91,141,239,.14)]",
  route: "bg-[rgba(62,199,141,.14)]",
  hangup: "bg-[rgba(240,85,106,.14)]",
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

// ─── Provider Card ────────────────────────────────────────────────────────────

function ProviderCard({
  name,
  description,
  features,
  connected,
  primary,
}: {
  name: string;
  description: string;
  features: string[];
  connected: boolean;
  primary?: boolean;
}) {
  return (
    <div
      className={`card p-4 border transition-all ${
        connected ? "border-green/50" : primary ? "border-gold/30" : "border-line"
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`grid place-items-center w-9 h-9 rounded-xl ${connected ? "bg-[rgba(62,199,141,.14)]" : "bg-panel-2"}`}>
            <Icon
              name="Headphones"
              size={17}
              className={connected ? "text-green" : "text-txt-dim"}
            />
          </div>
          <div>
            <div className="font-semibold text-sm">{name}</div>
            {primary && !connected && (
              <span className="tag bg-gold-soft text-gold-bright text-[9px] leading-none py-0.5 px-1.5">
                Recommended
              </span>
            )}
          </div>
        </div>
        <Badge tone={connected ? "green" : "neutral"}>
          {connected ? "Connected" : "Not Connected"}
        </Badge>
      </div>
      <p className="text-xs text-txt-dim mb-3">{description}</p>
      <div className="space-y-1 mb-3">
        {features.map((f) => (
          <div key={f} className="flex items-center gap-1.5 text-xs text-txt-dim">
            <Icon name="Check" size={11} className="text-green flex-shrink-0" />
            {f}
          </div>
        ))}
      </div>
      {!connected && (
        <a
          href="/settings"
          className="btn btn-ghost text-xs w-full justify-center border-line"
        >
          <Icon name="Plug" size={13} className="mr-1" />
          Connect in Settings
        </a>
      )}
    </div>
  );
}

// ─── IVR Flow Builder ─────────────────────────────────────────────────────────

function IvrFlowBuilder({ tenantId }: { tenantId: string }) {
  const STORAGE_KEY = `ivr_flow_${tenantId}`;
  const [nodes, setNodes] = useState<IvrNode[]>(DEFAULT_IVR_FLOW);
  const [loaded, setLoaded] = useState(false);
  const [saved, setSaved] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as IvrNode[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setNodes(parsed);
        }
      }
    } catch {
      // ignore
    }
    setLoaded(true);
  }, [STORAGE_KEY]);

  function saveFlow(updatedNodes: IvrNode[]) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedNodes));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      // ignore
    }
  }

  function addNode(type: IvrNode["type"]) {
    const defaults: Record<IvrNode["type"], Partial<IvrNode>> = {
      greeting: { label: "New greeting message…" },
      menu: {
        label: "Press 1 for Option A, Press 2 for Option B",
        options: [
          { key: "1", label: "Option A" },
          { key: "2", label: "Option B" },
        ],
      },
      route: { label: "Route to Agent Queue", routeTo: "General Queue" },
      hangup: { label: "Thank you for calling. Goodbye!" },
    };
    const newNode: IvrNode = {
      id: String(Date.now()),
      type,
      label: "",
      ...defaults[type],
    } as IvrNode;
    const updated = [...nodes, newNode];
    setNodes(updated);
    saveFlow(updated);
  }

  function removeNode(id: string) {
    const updated = nodes.filter((n) => n.id !== id);
    setNodes(updated);
    saveFlow(updated);
  }

  function moveUp(idx: number) {
    if (idx === 0) return;
    const updated = [...nodes];
    [updated[idx - 1], updated[idx]] = [updated[idx], updated[idx - 1]];
    setNodes(updated);
    saveFlow(updated);
  }

  function moveDown(idx: number) {
    if (idx === nodes.length - 1) return;
    const updated = [...nodes];
    [updated[idx], updated[idx + 1]] = [updated[idx + 1], updated[idx]];
    setNodes(updated);
    saveFlow(updated);
  }

  function startEdit(node: IvrNode) {
    setEditingId(node.id);
    setEditLabel(node.label);
  }

  function commitEdit() {
    if (!editingId) return;
    const updated = nodes.map((n) =>
      n.id === editingId ? { ...n, label: editLabel } : n
    );
    setNodes(updated);
    saveFlow(updated);
    setEditingId(null);
    setEditLabel("");
  }

  function resetFlow() {
    if (!confirm("Reset to default IVR flow?")) return;
    setNodes(DEFAULT_IVR_FLOW);
    saveFlow(DEFAULT_IVR_FLOW);
  }

  if (!loaded) {
    return <div className="skeleton h-48 rounded-xl" />;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-display font-bold text-base">IVR Flow Builder</h3>
          <p className="text-xs text-txt-dim mt-0.5">
            Built-in flow builder — saved locally in your browser.
            Connect Exotel/MyOperator in Settings to deploy live IVR.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {saved && (
            <span className="text-xs text-green flex items-center gap-1">
              <Icon name="Check" size={12} /> Saved
            </span>
          )}
          <button onClick={resetFlow} className="btn btn-ghost text-xs gap-1">
            <Icon name="RotateCcw" size={13} />
            Reset
          </button>
        </div>
      </div>

      {/* Flow nodes */}
      <div className="space-y-2 mb-4">
        {nodes.map((node, idx) => (
          <div key={node.id} className="flex items-start gap-2">
            {/* Connector line */}
            <div className="flex flex-col items-center pt-3">
              <div
                className={`grid place-items-center w-8 h-8 rounded-xl flex-shrink-0 ${NODE_BG[node.type]}`}
              >
                <Icon
                  name={NODE_ICONS[node.type]}
                  size={14}
                  className={NODE_COLORS[node.type]}
                />
              </div>
              {idx < nodes.length - 1 && (
                <div className="w-px h-4 bg-line mt-1" />
              )}
            </div>

            {/* Node content */}
            <div className="flex-1 card p-3 border border-line">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wide ${NODE_COLORS[node.type]}`}
                    >
                      {node.type}
                    </span>
                  </div>

                  {editingId === node.id ? (
                    <div className="flex gap-2">
                      <input
                        className="input text-sm flex-1"
                        value={editLabel}
                        onChange={(e) => setEditLabel(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && commitEdit()}
                        autoFocus
                      />
                      <button onClick={commitEdit} className="btn btn-primary py-1 px-3 text-xs">
                        Save
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="btn btn-ghost py-1 px-2 text-xs"
                      >
                        <Icon name="X" size={13} />
                      </button>
                    </div>
                  ) : (
                    <p className="text-sm text-txt-dim line-clamp-2">{node.label}</p>
                  )}

                  {node.type === "menu" && node.options && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {node.options.map((opt) => (
                        <span key={opt.key} className="tag bg-panel-2 text-txt-dim text-[10px]">
                          [{opt.key}] {opt.label}
                        </span>
                      ))}
                    </div>
                  )}
                  {node.type === "route" && node.routeTo && (
                    <span className="tag bg-[rgba(62,199,141,.14)] text-green text-[10px] mt-1">
                      → {node.routeTo}
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-0.5 flex-shrink-0">
                  <button
                    onClick={() => startEdit(node)}
                    className="btn btn-ghost p-1.5 text-txt-faint hover:text-gold-bright"
                    title="Edit"
                  >
                    <Icon name="Pencil" size={13} />
                  </button>
                  <button
                    onClick={() => moveUp(idx)}
                    disabled={idx === 0}
                    className="btn btn-ghost p-1.5 text-txt-faint hover:text-txt disabled:opacity-30"
                    title="Move up"
                  >
                    <Icon name="ChevronUp" size={13} />
                  </button>
                  <button
                    onClick={() => moveDown(idx)}
                    disabled={idx === nodes.length - 1}
                    className="btn btn-ghost p-1.5 text-txt-faint hover:text-txt disabled:opacity-30"
                    title="Move down"
                  >
                    <Icon name="ChevronDown" size={13} />
                  </button>
                  <button
                    onClick={() => removeNode(node.id)}
                    className="btn btn-ghost p-1.5 text-txt-faint hover:text-red"
                    title="Delete"
                  >
                    <Icon name="Trash2" size={13} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add node buttons */}
      <div className="border-t border-line pt-4">
        <p className="text-xs text-txt-faint mb-2 font-semibold uppercase tracking-wide">Add Step</p>
        <div className="flex flex-wrap gap-2">
          {(["greeting", "menu", "route", "hangup"] as IvrNode["type"][]).map((type) => (
            <button
              key={type}
              onClick={() => addNode(type)}
              className="btn btn-ghost text-xs gap-1.5 border-line"
            >
              <Icon name={NODE_ICONS[type]} size={13} className={NODE_COLORS[type]} />
              + {type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function IvrClient({ hasExotel, hasMyoperator, recentCalls, tenantId }: Props) {
  const [tab, setTab] = useState<"overview" | "calls" | "flow">("overview");
  const isConnected = hasExotel || hasMyoperator;

  const totalCalls = recentCalls.length;
  const connected = recentCalls.filter((c) => c.disposition === "CONNECTED").length;
  const avgDuration =
    recentCalls.filter((c) => c.durationSec > 0).length > 0
      ? Math.round(
          recentCalls.filter((c) => c.durationSec > 0).reduce((s, c) => s + c.durationSec, 0) /
            recentCalls.filter((c) => c.durationSec > 0).length
        )
      : 0;
  const connectRate = totalCalls > 0 ? Math.round((connected / totalCalls) * 100) : 0;

  return (
    <div>
      <PageHeader
        title="IVR Integration"
        subtitle="Connect Exotel or MyOperator for cloud telephony, IVR routing, and call recordings."
        icon="Headphones"
      />

      <ConnectBanner
        name="Exotel / MyOperator / Knowlarity"
        enables="Enables real click-to-call, live IVR flows, agent routing, and auto-recorded calls."
      />

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="card p-4">
          <div className="text-xs uppercase tracking-wide text-txt-faint font-semibold mb-1">Total Calls</div>
          <div className="font-display text-2xl font-bold">{totalCalls}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs uppercase tracking-wide text-txt-faint font-semibold mb-1">Connected</div>
          <div className="font-display text-2xl font-bold text-green">{connected}</div>
          <div className="text-xs text-txt-dim mt-1">{connectRate}% rate</div>
        </div>
        <div className="card p-4">
          <div className="text-xs uppercase tracking-wide text-txt-faint font-semibold mb-1">Avg Duration</div>
          <div className="font-display text-2xl font-bold text-gold-bright">
            {avgDuration > 0 ? `${Math.floor(avgDuration / 60)}m ${avgDuration % 60}s` : "—"}
          </div>
        </div>
        <div className="card p-4">
          <div className="text-xs uppercase tracking-wide text-txt-faint font-semibold mb-1">Provider</div>
          <div className="font-display text-lg font-bold">
            {hasExotel ? (
              <span className="text-green">Exotel</span>
            ) : hasMyoperator ? (
              <span className="text-green">MyOperator</span>
            ) : (
              <span className="text-txt-faint text-base">Not connected</span>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-5">
        <button
          onClick={() => setTab("overview")}
          className={`btn gap-2 ${tab === "overview" ? "btn-primary" : "btn-ghost"}`}
        >
          <Icon name="LayoutGrid" size={15} /> Providers
        </button>
        <button
          onClick={() => setTab("calls")}
          className={`btn gap-2 ${tab === "calls" ? "btn-primary" : "btn-ghost"}`}
        >
          <Icon name="History" size={15} /> Call Logs ({recentCalls.length})
        </button>
        <button
          onClick={() => setTab("flow")}
          className={`btn gap-2 ${tab === "flow" ? "btn-primary" : "btn-ghost"}`}
        >
          <Icon name="GitBranch" size={15} /> IVR Flow Builder
        </button>
      </div>

      {/* Providers tab */}
      {tab === "overview" && (
        <div className="grid md:grid-cols-3 gap-4">
          <ProviderCard
            name="Exotel"
            description="India's leading cloud telephony platform. Supports IVR, auto-dialer, call recording, and virtual numbers."
            features={[
              "Click-to-call from CRM",
              "Auto IVR routing",
              "Call recording + transcription",
              "Real-time analytics dashboard",
              "Virtual number assignment",
            ]}
            connected={hasExotel}
            primary
          />
          <ProviderCard
            name="MyOperator"
            description="Enterprise call management with multi-level IVR, agent desktop, and deep CRM integrations."
            features={[
              "Multi-level IVR builder",
              "Agent availability management",
              "Call queue management",
              "Sticky agent routing",
              "Campaign dialer",
            ]}
            connected={hasMyoperator}
          />
          <ProviderCard
            name="Knowlarity"
            description="Cloud communication suite with voice, SMS, and WhatsApp in a single platform."
            features={[
              "Superreceptionist IVR",
              "OBD (outbound dialer)",
              "Live call monitoring",
              "Missed call lead capture",
              "CRM webhook integration",
            ]}
            connected={false}
          />
        </div>
      )}

      {/* Call Logs tab */}
      {tab === "calls" && (
        <Card className="p-5">
          {recentCalls.length === 0 ? (
            <EmptyState
              icon="Phone"
              title="No call logs yet"
              hint="Call logs from the Sales Calling module or connected IVR provider will appear here."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line">
                    {["Caller", "Agent", "Direction", "Outcome", "Duration", "Recording", "Time"].map(
                      (h) => (
                        <th
                          key={h}
                          className="text-left py-2 pr-4 text-xs text-txt-faint font-semibold uppercase tracking-wide"
                        >
                          {h}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody>
                  {recentCalls.map((call) => (
                    <tr
                      key={call.id}
                      className="border-b border-line/40 hover:bg-panel/50 transition-colors"
                    >
                      <td className="py-2.5 pr-4">
                        <div className="font-medium">{call.leadName}</div>
                        <div className="text-xs text-txt-faint font-mono">{call.phone}</div>
                      </td>
                      <td className="py-2.5 pr-4">
                        {call.user ? (
                          <div className="flex items-center gap-1.5">
                            <div
                              className="w-6 h-6 rounded-full text-[10px] font-bold flex items-center justify-center text-[#1a1205] flex-shrink-0"
                              style={{ background: call.user.avatarColor }}
                            >
                              {initials(call.user.name)}
                            </div>
                            <span className="text-xs">{call.user.name.split(" ")[0]}</span>
                          </div>
                        ) : (
                          <span className="text-txt-faint text-xs">—</span>
                        )}
                      </td>
                      <td className="py-2.5 pr-4">
                        <div className="flex items-center gap-1 text-xs text-txt-dim">
                          <Icon
                            name={call.direction === "INBOUND" ? "PhoneIncoming" : "PhoneOutgoing"}
                            size={12}
                            className={
                              call.direction === "INBOUND" ? "text-blue" : "text-gold-bright"
                            }
                          />
                          {call.direction}
                        </div>
                      </td>
                      <td className="py-2.5 pr-4">
                        <Badge tone={DISP_TONE[call.disposition] ?? "neutral"}>
                          {call.disposition.replace(/_/g, " ")}
                        </Badge>
                      </td>
                      <td className="py-2.5 pr-4 text-txt-dim text-xs font-mono">
                        {fmtDuration(call.durationSec)}
                      </td>
                      <td className="py-2.5 pr-4">
                        {call.recordingUrl ? (
                          <a
                            href={call.recordingUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1 text-gold-bright hover:text-gold transition-colors text-xs"
                          >
                            <Icon name="Play" size={13} />
                            Play
                          </a>
                        ) : (
                          <span className="text-txt-faint text-xs flex items-center gap-1">
                            <Icon name="MicOff" size={12} />
                            No recording
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 text-xs text-txt-faint">{timeAgo(call.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* IVR Flow Builder tab */}
      {tab === "flow" && (
        <Card className="p-6">
          <IvrFlowBuilder tenantId={tenantId} />
        </Card>
      )}
    </div>
  );
}
