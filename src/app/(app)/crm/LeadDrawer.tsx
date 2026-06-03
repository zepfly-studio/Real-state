"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { inr, timeAgo, initials } from "@/lib/format";
import { Icon } from "@/components/Icon";
import type { LeadRow, UserRow } from "./board";

// ─── Stage / Activity helpers ─────────────────────────────────
const STAGE_LABELS: Record<string, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  SITE_VISIT: "Site Visit",
  NEGOTIATION: "Negotiation",
  CLOSED_WON: "Closed Won",
  CLOSED_LOST: "Closed Lost",
};

const STAGE_COLORS: Record<string, string> = {
  NEW: "#5b8def",
  CONTACTED: "#9b7ef0",
  SITE_VISIT: "#f0c14b",
  NEGOTIATION: "#d9a441",
  CLOSED_WON: "#3ec78d",
  CLOSED_LOST: "#f0556a",
};

const ACTIVITY_ICONS: Record<string, string> = {
  CALL: "Phone",
  NOTE: "FileText",
  STAGE_CHANGE: "GitBranch",
  WHATSAPP: "MessageCircle",
  SITE_VISIT: "MapPin",
  EMAIL: "Mail",
};

type Activity = {
  id: string;
  type: string;
  description: string;
  createdAt: string;
  createdBy: { id: string; name: string; avatarColor: string } | null;
};

// ─── Component ────────────────────────────────────────────────
export default function LeadDrawer({
  lead,
  users,
  onClose,
  onUpdate,
}: {
  lead: LeadRow;
  users: UserRow[];
  onClose: () => void;
  onUpdate: (updated: Partial<LeadRow> & { id: string }) => void;
}) {
  const router = useRouter();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(true);
  const [noteText, setNoteText] = useState("");
  const [posting, setPosting] = useState(false);
  const [stage, setStage] = useState(lead.stage);
  const [assignedToId, setAssignedToId] = useState(lead.assignedToId ?? "");
  const [saving, setSaving] = useState(false);

  const fetchActivities = useCallback(async () => {
    setLoadingActivities(true);
    try {
      const res = await fetch(`/api/leads/${lead.id}/activities`);
      if (res.ok) {
        const data = await res.json();
        setActivities(data);
      }
    } finally {
      setLoadingActivities(false);
    }
  }, [lead.id]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  async function logActivity(type: string, description: string) {
    setPosting(true);
    try {
      const res = await fetch(`/api/leads/${lead.id}/activities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, description }),
      });
      if (res.ok) {
        const act = await res.json();
        setActivities((prev) => [act, ...prev]);
      }
    } finally {
      setPosting(false);
    }
  }

  async function handleCall() {
    await logActivity("CALL", `Called ${lead.phone}`);
  }

  async function handleWhatsApp() {
    await logActivity("WHATSAPP", `WhatsApp message sent to ${lead.phone}`);
    window.open(`https://wa.me/${lead.phone.replace(/\D/g, "")}`, "_blank");
  }

  async function handleAddNote() {
    const text = noteText.trim();
    if (!text) return;
    await logActivity("NOTE", text);
    setNoteText("");
  }

  async function handleStageChange(newStage: string) {
    if (newStage === stage) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/leads/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: newStage }),
      });
      if (res.ok) {
        setStage(newStage);
        onUpdate({ id: lead.id, stage: newStage });
        await fetchActivities();
        router.refresh();
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleAssign(newId: string) {
    setAssignedToId(newId);
    setSaving(true);
    try {
      const res = await fetch(`/api/leads/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignedToId: newId || null }),
      });
      if (res.ok) {
        const assignedTo = users.find((u) => u.id === newId) ?? null;
        onUpdate({ id: lead.id, assignedToId: newId || null, assignedTo });
        router.refresh();
      }
    } finally {
      setSaving(false);
    }
  }

  const tempCls =
    lead.temperature === "HOT"
      ? "tag-hot"
      : lead.temperature === "WARM"
      ? "tag-warm"
      : "tag-cold";

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-lg bg-bg border-l border-line z-50 flex flex-col animate-slide-in overflow-hidden">
        {/* Header */}
        <div className="flex items-start gap-3 p-5 border-b border-line flex-shrink-0">
          <div
            className="grid place-items-center w-10 h-10 rounded-full text-sm font-bold text-[#1a1205] flex-shrink-0 mt-0.5"
            style={{ background: "#d9a441" }}
          >
            {initials(lead.name)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-display font-bold text-lg leading-tight truncate">
              {lead.name}
            </div>
            <div className="text-txt-dim text-sm mt-0.5">
              {lead.phone}
              {lead.email && <span className="ml-2">&middot; {lead.email}</span>}
            </div>
          </div>
          <button
            onClick={onClose}
            className="btn btn-ghost p-2 flex-shrink-0"
            aria-label="Close"
          >
            <Icon name="X" size={18} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Lead Details */}
          <section>
            <div className="section-label mb-3">Lead Details</div>
            <div className="grid grid-cols-2 gap-3">
              <DetailItem label="Property" value={lead.propertyType} />
              <DetailItem label="Location" value={lead.location} />
              <DetailItem
                label="Source"
                value={lead.source.replace(/_/g, " ")}
              />
              <DetailItem
                label="Value"
                value={
                  <span className="text-gold-bright font-semibold">
                    {inr(lead.value)}
                  </span>
                }
              />
              <DetailItem
                label="Temperature"
                value={
                  <span className={`tag ${tempCls} text-[10px] font-bold uppercase`}>
                    {lead.temperature}
                  </span>
                }
              />
              <DetailItem
                label="Created"
                value={timeAgo(lead.createdAt)}
              />
              {lead.nextFollowUp && (
                <DetailItem
                  label="Follow-up"
                  value={new Date(lead.nextFollowUp).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                />
              )}
              {lead.notes && (
                <div className="col-span-2">
                  <DetailItem label="Notes" value={lead.notes} />
                </div>
              )}
            </div>
          </section>

          {/* Change Stage */}
          <section>
            <div className="section-label mb-3">Pipeline Stage</div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(STAGE_LABELS).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => handleStageChange(key)}
                  disabled={saving}
                  className={`px-3 py-1.5 rounded-lg text-sm font-semibold border transition-all ${
                    stage === key
                      ? "text-[#1a1205] border-transparent"
                      : "border-line text-txt-dim hover:border-gold/50"
                  }`}
                  style={
                    stage === key
                      ? { background: STAGE_COLORS[key], borderColor: STAGE_COLORS[key] }
                      : {}
                  }
                >
                  {label}
                </button>
              ))}
            </div>
          </section>

          {/* Assign To */}
          <section>
            <div className="section-label mb-2">Assigned To</div>
            <select
              value={assignedToId}
              onChange={(e) => handleAssign(e.target.value)}
              className="input w-full"
              disabled={saving}
            >
              <option value="">Unassigned</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role})
                </option>
              ))}
            </select>
          </section>

          {/* Quick Actions */}
          <section>
            <div className="section-label mb-3">Quick Actions</div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleCall}
                disabled={posting}
                className="btn btn-ghost flex items-center gap-2 text-sm"
              >
                <Icon name="Phone" size={14} />
                Log Call
              </button>
              <button
                onClick={handleWhatsApp}
                disabled={posting}
                className="btn btn-ghost flex items-center gap-2 text-sm text-green"
              >
                <Icon name="MessageCircle" size={14} />
                WhatsApp
              </button>
            </div>
          </section>

          {/* Add Note */}
          <section>
            <div className="section-label mb-2">Add Note</div>
            <div className="flex gap-2">
              <input
                type="text"
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Type a note…"
                className="input flex-1 text-sm"
                onKeyDown={(e) => e.key === "Enter" && handleAddNote()}
              />
              <button
                onClick={handleAddNote}
                disabled={posting || !noteText.trim()}
                className="btn btn-primary text-sm px-4"
              >
                Add
              </button>
            </div>
          </section>

          {/* Activity Timeline */}
          <section>
            <div className="section-label mb-3">Activity Timeline</div>
            {loadingActivities ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="skeleton h-12 rounded-lg" />
                ))}
              </div>
            ) : activities.length === 0 ? (
              <div className="text-txt-faint text-sm text-center py-6">
                No activities yet.
              </div>
            ) : (
              <div className="space-y-3">
                {activities.map((act) => (
                  <ActivityItem key={act.id} activity={act} />
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </>
  );
}

function DetailItem({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <div className="field-label mb-0.5">{label}</div>
      <div className="text-sm font-medium">{value}</div>
    </div>
  );
}

function ActivityItem({ activity }: { activity: Activity }) {
  const iconName = ACTIVITY_ICONS[activity.type] ?? "Circle";
  const iconColor =
    activity.type === "CALL"
      ? "text-blue"
      : activity.type === "WHATSAPP"
      ? "text-green"
      : activity.type === "STAGE_CHANGE"
      ? "text-gold-bright"
      : activity.type === "SITE_VISIT"
      ? "text-purple"
      : "text-txt-dim";

  return (
    <div className="flex items-start gap-3">
      <div className={`mt-0.5 flex-shrink-0 ${iconColor}`}>
        <Icon name={iconName} size={14} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm leading-snug">{activity.description}</div>
        <div className="text-[11px] text-txt-faint mt-0.5 flex items-center gap-1">
          {activity.createdBy && (
            <>
              <span>{activity.createdBy.name}</span>
              <span>&middot;</span>
            </>
          )}
          <span>{timeAgo(activity.createdAt)}</span>
        </div>
      </div>
    </div>
  );
}
