"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, PageHeader, Badge, ConnectBanner, EmptyState } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { timeAgo } from "@/lib/format";

// ─── Types ────────────────────────────────────────────────────────────────────

interface WorkflowAction {
  type: "NOTIFY" | "SEND_WHATSAPP" | "CREATE_TASK" | "UPDATE_FIELD";
  params: Record<string, string>;
}

interface WorkflowTrigger {
  id: string;
  name: string;
  event: { type: string; filters?: Record<string, string> };
  actions: WorkflowAction[];
  isActive: boolean;
  runCount: number;
  createdAt: string;
}

interface Props {
  triggers: WorkflowTrigger[];
  tenantId: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const EVENT_OPTIONS = [
  { value: "LEAD_CREATED", label: "Lead Created", icon: "UserPlus", description: "Fires when a new lead is added" },
  { value: "STAGE_CHANGED", label: "Stage Changed", icon: "ArrowRightCircle", description: "Fires when lead moves to a new stage" },
  { value: "SITE_VISIT_DONE", label: "Site Visit Done", icon: "MapPin", description: "Fires when a site visit is completed" },
  { value: "BOOKING_CREATED", label: "Booking Created", icon: "FileCheck2", description: "Fires when a new booking is made" },
  { value: "NO_FOLLOWUP_48H", label: "No Follow-up 48h", icon: "Clock", description: "Fires when lead has no activity for 48 hours" },
];

const ACTION_OPTIONS = [
  { value: "NOTIFY", label: "Send Notification", icon: "Bell", description: "Notify manager/admin via in-app alert" },
  { value: "SEND_WHATSAPP", label: "Send WhatsApp", icon: "MessageCircle", description: "Send a WhatsApp template message to lead" },
  { value: "CREATE_TASK", label: "Create Task", icon: "CheckSquare", description: "Create a follow-up task for assigned agent" },
  { value: "UPDATE_FIELD", label: "Update Field", icon: "Edit3", description: "Auto-update a lead field value" },
];

const EXAMPLE_AUTOMATIONS = [
  {
    name: "Hot Lead Alert",
    event: "LEAD_CREATED",
    filter: "temperature=HOT",
    actions: ["NOTIFY → ADMIN, MANAGER", "SEND_WHATSAPP → Welcome template"],
    description: "When a hot lead arrives, instantly notify managers and send a greeting WhatsApp.",
  },
  {
    name: "Missed Follow-up Escalation",
    event: "NO_FOLLOWUP_48H",
    filter: "temperature=HOT",
    actions: ["NOTIFY → MANAGER", "CREATE_TASK → Follow up urgently"],
    description: "Escalate to manager when a hot lead goes 48h without contact.",
  },
  {
    name: "Site Visit Thank You",
    event: "SITE_VISIT_DONE",
    filter: "",
    actions: ["SEND_WHATSAPP → Thank you + brochure link"],
    description: "Automatically send a thank-you message and brochure after every site visit.",
  },
  {
    name: "Booking Stage Update",
    event: "BOOKING_CREATED",
    filter: "",
    actions: ["UPDATE_FIELD → stage=CLOSED_WON", "NOTIFY → ADMIN"],
    description: "Auto-move lead to Closed Won and notify admin on booking.",
  },
];

const DISPOSITION_COLORS: Record<string, string> = {
  LEAD_CREATED: "gold",
  STAGE_CHANGED: "blue",
  SITE_VISIT_DONE: "green",
  BOOKING_CREATED: "purple",
  NO_FOLLOWUP_48H: "red",
};

function eventLabel(type: string): string {
  return EVENT_OPTIONS.find((e) => e.value === type)?.label ?? type;
}

function actionSummary(actions: WorkflowAction[]): string {
  if (!actions?.length) return "—";
  return actions
    .map((a) => {
      const label = ACTION_OPTIONS.find((o) => o.value === a.type)?.label ?? a.type;
      const detail =
        a.type === "NOTIFY"
          ? `to ${a.params?.role ?? "MANAGER"}`
          : a.type === "SEND_WHATSAPP"
          ? `"${(a.params?.template ?? "").slice(0, 20)}…"`
          : a.type === "CREATE_TASK"
          ? `"${a.params?.label ?? "Task"}"`
          : a.params?.field
          ? `${a.params.field}=${a.params.value}`
          : "";
      return `${label}${detail ? " (" + detail + ")" : ""}`;
    })
    .join(" → ");
}

// ─── New Automation Modal ─────────────────────────────────────────────────────

function NewAutomationModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (data: { name: string; event: object; actions: object[] }) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [eventType, setEventType] = useState("LEAD_CREATED");
  const [filterKey, setFilterKey] = useState("");
  const [filterValue, setFilterValue] = useState("");
  const [actions, setActions] = useState<WorkflowAction[]>([
    { type: "NOTIFY", params: { role: "MANAGER" } },
  ]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function addAction() {
    setActions((prev) => [...prev, { type: "NOTIFY", params: { role: "MANAGER" } }]);
  }

  function removeAction(idx: number) {
    setActions((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateAction(idx: number, type: WorkflowAction["type"]) {
    setActions((prev) => {
      const next = [...prev];
      const defaultParams: Record<WorkflowAction["type"], Record<string, string>> = {
        NOTIFY: { role: "MANAGER" },
        SEND_WHATSAPP: { template: "" },
        CREATE_TASK: { label: "Follow up" },
        UPDATE_FIELD: { field: "stage", value: "CONTACTED" },
      };
      next[idx] = { type, params: defaultParams[type] };
      return next;
    });
  }

  function updateActionParam(idx: number, key: string, value: string) {
    setActions((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], params: { ...next[idx].params, [key]: value } };
      return next;
    });
  }

  async function handleSave() {
    if (!name.trim()) { setError("Please enter a name."); return; }
    if (!actions.length) { setError("Add at least one action."); return; }
    setSaving(true);
    setError("");
    try {
      const filters: Record<string, string> = {};
      if (filterKey && filterValue) filters[filterKey] = filterValue;
      await onSave({
        name,
        event: { type: eventType, ...(Object.keys(filters).length ? { filters } : {}) },
        actions,
      });
      onClose();
    } catch {
      setError("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const selectedEvent = EVENT_OPTIONS.find((e) => e.value === eventType);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-bg rounded-[16px] border border-line w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display font-bold text-xl">New Automation</h3>
          <button onClick={onClose} className="btn btn-ghost p-2 rounded-lg">
            <Icon name="X" size={18} />
          </button>
        </div>

        {/* Name */}
        <div className="mb-4">
          <label className="field-label">Automation Name</label>
          <input
            className="input w-full"
            placeholder="e.g. Hot Lead Alert"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        {/* WHEN section */}
        <div className="card p-4 mb-4">
          <div className="section-label mb-3">WHEN (Trigger Event)</div>
          <div className="grid grid-cols-1 gap-2">
            {EVENT_OPTIONS.map((ev) => (
              <button
                key={ev.value}
                onClick={() => setEventType(ev.value)}
                className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
                  eventType === ev.value
                    ? "border-gold bg-gold-soft"
                    : "border-line hover:border-gold/40"
                }`}
              >
                <Icon name={ev.icon} size={16} className="mt-0.5 text-gold-bright flex-shrink-0" />
                <div>
                  <div className="text-sm font-semibold">{ev.label}</div>
                  <div className="text-xs text-txt-dim">{ev.description}</div>
                </div>
              </button>
            ))}
          </div>

          {/* Optional filter */}
          <div className="mt-3 border-t border-line pt-3">
            <label className="field-label mb-2">Optional Filter (e.g. temperature=HOT)</label>
            <div className="flex gap-2">
              <input
                className="input flex-1"
                placeholder="Field (e.g. temperature)"
                value={filterKey}
                onChange={(e) => setFilterKey(e.target.value)}
              />
              <input
                className="input flex-1"
                placeholder="Value (e.g. HOT)"
                value={filterValue}
                onChange={(e) => setFilterValue(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* THEN / Actions section */}
        <div className="card p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="section-label">THEN (Actions)</div>
            <button onClick={addAction} className="btn btn-ghost text-xs gap-1 py-1 px-2">
              <Icon name="Plus" size={13} /> Add Action
            </button>
          </div>
          <div className="space-y-3">
            {actions.map((action, idx) => (
              <div key={idx} className="border border-line rounded-xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <select
                    className="input text-sm flex-1 mr-2"
                    value={action.type}
                    onChange={(e) => updateAction(idx, e.target.value as WorkflowAction["type"])}
                  >
                    {ACTION_OPTIONS.map((a) => (
                      <option key={a.value} value={a.value}>{a.label}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => removeAction(idx)}
                    className="text-txt-faint hover:text-red transition-colors"
                  >
                    <Icon name="Trash2" size={15} />
                  </button>
                </div>

                {/* Action-specific params */}
                {action.type === "NOTIFY" && (
                  <select
                    className="input text-sm w-full"
                    value={action.params.role ?? "MANAGER"}
                    onChange={(e) => updateActionParam(idx, "role", e.target.value)}
                  >
                    <option value="MANAGER">Notify Manager</option>
                    <option value="ADMIN">Notify Admin</option>
                    <option value="BOTH">Notify Manager + Admin</option>
                  </select>
                )}
                {action.type === "SEND_WHATSAPP" && (
                  <textarea
                    className="input text-sm w-full resize-none"
                    rows={3}
                    placeholder="WhatsApp template text… use {{name}} for lead name"
                    value={action.params.template ?? ""}
                    onChange={(e) => updateActionParam(idx, "template", e.target.value)}
                  />
                )}
                {action.type === "CREATE_TASK" && (
                  <input
                    className="input text-sm w-full"
                    placeholder="Task label, e.g. Follow up within 24h"
                    value={action.params.label ?? ""}
                    onChange={(e) => updateActionParam(idx, "label", e.target.value)}
                  />
                )}
                {action.type === "UPDATE_FIELD" && (
                  <div className="flex gap-2">
                    <input
                      className="input text-sm flex-1"
                      placeholder="Field (e.g. stage)"
                      value={action.params.field ?? ""}
                      onChange={(e) => updateActionParam(idx, "field", e.target.value)}
                    />
                    <input
                      className="input text-sm flex-1"
                      placeholder="Value (e.g. CONTACTED)"
                      value={action.params.value ?? ""}
                      onChange={(e) => updateActionParam(idx, "value", e.target.value)}
                    />
                  </div>
                )}
              </div>
            ))}
            {actions.length === 0 && (
              <p className="text-txt-faint text-sm text-center py-2">No actions yet — click Add Action.</p>
            )}
          </div>
        </div>

        {/* Preview */}
        {name && (
          <div className="rounded-xl bg-panel p-3 mb-4 border border-gold/20 text-sm">
            <span className="text-txt-dim">Preview: </span>
            <span className="font-semibold text-gold-bright">{name}</span>
            <span className="text-txt-dim"> → When </span>
            <span className="font-semibold">{selectedEvent?.label}</span>
            {filterKey && <span className="text-txt-dim"> (if {filterKey}={filterValue})</span>}
            <span className="text-txt-dim"> → </span>
            <span>{actionSummary(actions)}</span>
          </div>
        )}

        {error && <p className="text-red text-sm mb-3">{error}</p>}

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="btn btn-ghost">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn btn-primary gap-2">
            {saving ? <Icon name="Loader2" size={15} className="animate-spin" /> : <Icon name="Zap" size={15} />}
            {saving ? "Saving…" : "Save Automation"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function WorkflowsClient({ triggers: initialTriggers, tenantId }: Props) {
  const router = useRouter();
  const [triggers, setTriggers] = useState<WorkflowTrigger[]>(initialTriggers);
  const [showModal, setShowModal] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);

  async function handleSave(data: { name: string; event: object; actions: object[] }) {
    const res = await fetch("/api/workflows", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to save");
    router.refresh();
    const newTrigger = await res.json();
    setTriggers((prev) => [newTrigger, ...prev]);
  }

  async function handleToggle(id: string, current: boolean) {
    setToggling(id);
    try {
      await fetch(`/api/workflows/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !current }),
      });
      setTriggers((prev) => prev.map((t) => t.id === id ? { ...t, isActive: !current } : t));
    } finally {
      setToggling(null);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this automation?")) return;
    setDeleting(id);
    try {
      await fetch(`/api/workflows/${id}`, { method: "DELETE" });
      setTriggers((prev) => prev.filter((t) => t.id !== id));
    } finally {
      setDeleting(null);
    }
  }

  const activeTriggers = triggers.filter((t) => t.isActive).length;
  const totalRuns = triggers.reduce((s, t) => s + t.runCount, 0);

  return (
    <div>
      <PageHeader
        title="Workflow Triggers"
        subtitle="Automate your sales process — set triggers and let the OS work for you."
        icon="Workflow"
        actions={
          <button onClick={() => setShowModal(true)} className="btn btn-primary gap-2">
            <Icon name="Plus" size={16} />
            New Automation
          </button>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="card p-4">
          <div className="text-xs uppercase tracking-wide text-txt-faint font-semibold mb-1">Total</div>
          <div className="font-display text-2xl font-bold">{triggers.length}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs uppercase tracking-wide text-txt-faint font-semibold mb-1">Active</div>
          <div className="font-display text-2xl font-bold text-green">{activeTriggers}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs uppercase tracking-wide text-txt-faint font-semibold mb-1">Total Runs</div>
          <div className="font-display text-2xl font-bold text-gold-bright">{totalRuns.toLocaleString()}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs uppercase tracking-wide text-txt-faint font-semibold mb-1">Paused</div>
          <div className="font-display text-2xl font-bold text-txt-dim">{triggers.length - activeTriggers}</div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Triggers list */}
        <div className="lg:col-span-2">
          <Card className="p-5">
            <h3 className="font-display font-bold text-lg mb-4">Your Automations</h3>

            {triggers.length === 0 ? (
              <EmptyState
                icon="Workflow"
                title="No automations yet"
                hint="Create your first workflow trigger to automate lead follow-ups, notifications, and more."
                action={
                  <button onClick={() => setShowModal(true)} className="btn btn-primary gap-2">
                    <Icon name="Zap" size={15} /> Create First Automation
                  </button>
                }
              />
            ) : (
              <div className="space-y-3">
                {triggers.map((t) => {
                  const eventMeta = EVENT_OPTIONS.find((e) => e.value === t.event.type);
                  const tone = (DISPOSITION_COLORS[t.event.type] ?? "neutral") as "gold" | "blue" | "green" | "purple" | "red" | "neutral";
                  return (
                    <div
                      key={t.id}
                      className={`border rounded-xl p-4 transition-all ${
                        t.isActive ? "border-line" : "border-line/40 opacity-60"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="grid place-items-center w-9 h-9 rounded-xl bg-panel-2 text-gold-bright flex-shrink-0 mt-0.5">
                            <Icon name={eventMeta?.icon ?? "Zap"} size={16} />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-sm">{t.name}</span>
                              <Badge tone={t.isActive ? "green" : "neutral"}>
                                {t.isActive ? "Active" : "Paused"}
                              </Badge>
                              {t.runCount > 0 && (
                                <Badge tone="gold">{t.runCount} runs</Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 mt-1 text-xs text-txt-dim">
                              <Badge tone={tone}>{eventLabel(t.event.type)}</Badge>
                              {t.event.filters && Object.entries(t.event.filters).map(([k, v]) => (
                                <span key={k} className="text-txt-faint">if {k}={v}</span>
                              ))}
                            </div>
                            <p className="text-xs text-txt-faint mt-1.5 line-clamp-1">
                              {actionSummary(t.actions)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <button
                            onClick={() => handleToggle(t.id, t.isActive)}
                            disabled={toggling === t.id}
                            className={`btn btn-ghost py-1 px-2.5 text-xs gap-1 ${
                              t.isActive ? "text-green" : "text-txt-dim"
                            }`}
                          >
                            {toggling === t.id ? (
                              <Icon name="Loader2" size={13} className="animate-spin" />
                            ) : (
                              <Icon name={t.isActive ? "ToggleRight" : "ToggleLeft"} size={16} />
                            )}
                            {t.isActive ? "On" : "Off"}
                          </button>
                          <button
                            onClick={() => handleDelete(t.id)}
                            disabled={deleting === t.id}
                            className="btn btn-ghost py-1 px-2 text-txt-faint hover:text-red"
                          >
                            {deleting === t.id ? (
                              <Icon name="Loader2" size={14} className="animate-spin" />
                            ) : (
                              <Icon name="Trash2" size={14} />
                            )}
                          </button>
                        </div>
                      </div>
                      <div className="mt-2 text-[11px] text-txt-faint">
                        Created {timeAgo(t.createdAt)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        {/* Examples panel */}
        <div className="space-y-4">
          <Card className="p-5">
            <h3 className="font-display font-semibold text-base mb-1">How Triggers Work</h3>
            <p className="text-sm text-txt-dim mb-4">
              Triggers run automatically in the background whenever the defined event occurs in your CRM.
              No code needed — just set up once and let Real Estate OS do the work.
            </p>
            <div className="space-y-2 text-sm">
              {[
                { icon: "UserPlus", text: "Lead Created → Auto-assign & notify" },
                { icon: "ArrowRightCircle", text: "Stage Changed → Update tasks & send messages" },
                { icon: "Clock", text: "No Follow-up 48h → Escalation alert" },
                { icon: "FileCheck2", text: "Booking Created → Celebrate + update CRM" },
              ].map((item) => (
                <div key={item.icon} className="flex items-center gap-2 text-txt-dim">
                  <Icon name={item.icon} size={14} className="text-gold-bright flex-shrink-0" />
                  <span>{item.text}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="font-display font-semibold text-base mb-3">Example Automations</h3>
            <div className="space-y-3">
              {EXAMPLE_AUTOMATIONS.map((ex) => (
                <div key={ex.name} className="border border-line/50 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Icon name="Zap" size={13} className="text-gold-bright" />
                    <span className="text-sm font-semibold">{ex.name}</span>
                  </div>
                  <p className="text-xs text-txt-dim mb-2">{ex.description}</p>
                  <div className="flex flex-wrap gap-1">
                    <span className="tag bg-gold-soft text-gold-bright text-[10px]">{ex.event}</span>
                    {ex.filter && (
                      <span className="tag bg-panel-2 text-txt-dim text-[10px]">{ex.filter}</span>
                    )}
                  </div>
                  <div className="mt-1.5 text-[11px] text-txt-faint">
                    {ex.actions.join(" | ")}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {showModal && (
        <NewAutomationModal
          onClose={() => setShowModal(false)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
