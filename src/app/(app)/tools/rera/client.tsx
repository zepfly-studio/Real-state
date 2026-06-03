"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card, PageHeader, Badge, EmptyState, KPICard } from "@/components/ui";
import { Icon } from "@/components/Icon";

interface ReraDoc {
  name: string;
  ok: boolean;
}

interface ReraDeadline {
  label: string;
  due: string;
}

interface ReraProject {
  id: string;
  projectName: string;
  reraNo: string;
  registeredAt: string;
  expiryAt: string;
  docs: ReraDoc[];
  deadlines: ReraDeadline[];
  createdAt: string;
}

function daysUntil(dateStr: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.floor((target.getTime() - now.getTime()) / 86400000);
}

function expiryTone(days: number): "red" | "gold" | "green" | "neutral" {
  if (days < 0) return "red";
  if (days <= 30) return "red";
  if (days <= 90) return "gold";
  return "green";
}

function expiryLabel(days: number): string {
  if (days < 0) return `Expired ${Math.abs(days)}d ago`;
  if (days === 0) return "Expires today";
  return `${days}d to expiry`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const AREA_COLORS: Record<string, string> = {
  green: "text-green",
  gold: "text-gold-bright",
  red: "text-red",
  neutral: "text-txt-dim",
};

// ─── Add Project Modal ───────────────────────────────────────────

function AddProjectModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState({
    projectName: "",
    reraNo: "",
    registeredAt: "",
    expiryAt: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.projectName || !form.reraNo || !form.registeredAt || !form.expiryAt) {
      setError("All fields are required.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/rera", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Failed to create project.");
        return;
      }
      onCreated();
      onClose();
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="card w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display font-bold text-lg">Add RERA Project</h3>
          <button onClick={onClose} className="btn btn-ghost p-2">
            <Icon name="X" size={18} />
          </button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="field-label">Project Name</label>
            <input
              className="input w-full"
              placeholder="e.g. Shubh Heights Phase 2"
              value={form.projectName}
              onChange={(e) => setForm({ ...form, projectName: e.target.value })}
            />
          </div>
          <div>
            <label className="field-label">RERA Registration No.</label>
            <input
              className="input w-full"
              placeholder="e.g. RAJ/P/2023/1234"
              value={form.reraNo}
              onChange={(e) => setForm({ ...form, reraNo: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="field-label">Registered On</label>
              <input
                type="date"
                className="input w-full"
                value={form.registeredAt}
                onChange={(e) => setForm({ ...form, registeredAt: e.target.value })}
              />
            </div>
            <div>
              <label className="field-label">Expiry Date</label>
              <input
                type="date"
                className="input w-full"
                value={form.expiryAt}
                onChange={(e) => setForm({ ...form, expiryAt: e.target.value })}
              />
            </div>
          </div>
          {error && <p className="text-red text-sm">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn btn-ghost flex-1">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn btn-primary flex-1">
              {loading ? "Creating…" : "Create Project"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Project Card ────────────────────────────────────────────────

function ProjectCard({
  project,
  onUpdated,
}: {
  project: ReraProject;
  onUpdated: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const days = daysUntil(project.expiryAt);
  const tone = expiryTone(days);

  const sortedDeadlines = useMemo(
    () =>
      [...project.deadlines].sort(
        (a, b) => new Date(a.due).getTime() - new Date(b.due).getTime()
      ),
    [project.deadlines]
  );

  async function toggleDoc(idx: number, current: boolean) {
    const newDocs = project.docs.map((d, i) =>
      i === idx ? { ...d, ok: !current } : d
    );
    try {
      await fetch(`/api/rera/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ docs: newDocs }),
      });
      onUpdated();
    } catch {
      // silent
    }
  }

  const docsComplete = project.docs.filter((d) => d.ok).length;
  const docsTotal = project.docs.length;

  return (
    <Card className="p-5">
      {/* Header */}
      <div className="flex flex-wrap items-start gap-3 mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-display font-bold text-base leading-tight">
              {project.projectName}
            </h3>
            <Badge tone={tone === "red" ? "red" : tone === "gold" ? "gold" : "green"}>
              {expiryLabel(days)}
            </Badge>
          </div>
          <p className="text-txt-dim text-sm mt-0.5 font-mono">{project.reraNo}</p>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="btn btn-ghost text-xs gap-1"
        >
          <Icon name={expanded ? "ChevronUp" : "ChevronDown"} size={14} />
          {expanded ? "Collapse" : "Details"}
        </button>
      </div>

      {/* Key dates */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
        <div className="bg-panel rounded-xl p-3">
          <p className="text-[11px] uppercase tracking-wide text-txt-faint mb-1">Registered</p>
          <p className="font-semibold text-sm">{formatDate(project.registeredAt)}</p>
        </div>
        <div className="bg-panel rounded-xl p-3">
          <p className="text-[11px] uppercase tracking-wide text-txt-faint mb-1">Expires</p>
          <p className={`font-semibold text-sm ${AREA_COLORS[tone]}`}>
            {formatDate(project.expiryAt)}
          </p>
        </div>
        <div className="bg-panel rounded-xl p-3">
          <p className="text-[11px] uppercase tracking-wide text-txt-faint mb-1">Documents</p>
          <p className="font-semibold text-sm">
            {docsComplete}/{docsTotal}
            <span className="text-txt-faint font-normal text-xs ml-1">done</span>
          </p>
        </div>
      </div>

      {/* Doc progress bar */}
      {docsTotal > 0 && (
        <div className="h-1.5 rounded-full bg-bg-2 overflow-hidden mb-4">
          <div
            className="h-full rounded-full bg-gradient-to-r from-gold to-gold-bright transition-all duration-500"
            style={{ width: `${(docsComplete / docsTotal) * 100}%` }}
          />
        </div>
      )}

      {expanded && (
        <div className="space-y-4 pt-2 border-t border-line">
          {/* Document Checklist */}
          {project.docs.length > 0 && (
            <div>
              <p className="section-label mb-2">Document Checklist</p>
              <div className="space-y-2">
                {project.docs.map((doc, i) => (
                  <label
                    key={i}
                    className="flex items-center gap-3 cursor-pointer group"
                  >
                    <button
                      type="button"
                      onClick={() => toggleDoc(i, doc.ok)}
                      className={`w-5 h-5 rounded flex-shrink-0 border-2 flex items-center justify-center transition-colors ${
                        doc.ok
                          ? "bg-gold-bright border-gold-bright"
                          : "border-line bg-transparent hover:border-gold"
                      }`}
                    >
                      {doc.ok && <Icon name="Check" size={12} className="text-[#1a1205]" />}
                    </button>
                    <span
                      className={`text-sm transition-colors ${
                        doc.ok ? "line-through text-txt-faint" : "text-txt group-hover:text-gold-bright"
                      }`}
                    >
                      {doc.name}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Deadline Calendar */}
          {sortedDeadlines.length > 0 && (
            <div>
              <p className="section-label mb-2">Deadline Calendar</p>
              <div className="space-y-2">
                {sortedDeadlines.map((dl, i) => {
                  const dlDays = daysUntil(dl.due);
                  const overdue = dlDays < 0;
                  const upcoming = dlDays >= 0 && dlDays <= 30;
                  return (
                    <div
                      key={i}
                      className={`flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 ${
                        overdue
                          ? "bg-[rgba(240,85,106,.08)]"
                          : upcoming
                          ? "bg-[rgba(217,164,65,.08)]"
                          : "bg-panel"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Icon
                          name={overdue ? "AlertCircle" : upcoming ? "Clock" : "CalendarDays"}
                          size={14}
                          className={
                            overdue
                              ? "text-red"
                              : upcoming
                              ? "text-gold-bright"
                              : "text-txt-faint"
                          }
                        />
                        <span className="text-sm font-medium">{dl.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-txt-dim">{formatDate(dl.due)}</span>
                        <Badge tone={overdue ? "red" : upcoming ? "gold" : "neutral"}>
                          {overdue
                            ? `${Math.abs(dlDays)}d overdue`
                            : dlDays === 0
                            ? "Today"
                            : `in ${dlDays}d`}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

// ─── Main Client Component ───────────────────────────────────────

export function ReraClient({
  projects: initialProjects,
}: {
  projects: ReraProject[];
  tenantId: string;
}) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [projects] = useState(initialProjects);

  function refresh() {
    router.refresh();
  }

  // Alert summary
  const expired = projects.filter((p) => daysUntil(p.expiryAt) < 0).length;
  const criticalExpiry = projects.filter(
    (p) => daysUntil(p.expiryAt) >= 0 && daysUntil(p.expiryAt) <= 30
  ).length;
  const amberExpiry = projects.filter(
    (p) => daysUntil(p.expiryAt) > 30 && daysUntil(p.expiryAt) <= 90
  ).length;
  const compliant = projects.filter((p) => daysUntil(p.expiryAt) > 90).length;

  return (
    <div>
      <PageHeader
        title="RERA Compliance"
        subtitle="Track registrations, documents, and deadlines for all projects."
        icon="ShieldCheck"
        actions={
          <button onClick={() => setShowModal(true)} className="btn btn-primary gap-2">
            <Icon name="Plus" size={16} />
            Add Project
          </button>
        }
      />

      {/* Alert Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <KPICard
          label="Expired"
          value={String(expired)}
          icon="ShieldX"
          accent="red"
        />
        <KPICard
          label="Critical (≤30d)"
          value={String(criticalExpiry)}
          icon="AlertTriangle"
          accent="red"
        />
        <KPICard
          label="Expiring Soon (≤90d)"
          value={String(amberExpiry)}
          icon="Clock"
          accent="gold"
        />
        <KPICard
          label="Compliant"
          value={String(compliant)}
          icon="ShieldCheck"
          accent="green"
        />
      </div>

      {/* Alert banner */}
      {(expired > 0 || criticalExpiry > 0) && (
        <div className="card p-4 flex items-center gap-3 border-dashed border-red mb-5 bg-[rgba(240,85,106,.06)]">
          <Icon name="AlertTriangle" size={18} className="text-red flex-shrink-0" />
          <p className="text-sm">
            <span className="font-bold text-red">
              {expired > 0 ? `${expired} project${expired > 1 ? "s" : ""} expired` : ""}
              {expired > 0 && criticalExpiry > 0 ? " · " : ""}
              {criticalExpiry > 0
                ? `${criticalExpiry} project${criticalExpiry > 1 ? "s" : ""} expiring within 30 days`
                : ""}
            </span>
            <span className="text-txt-dim ml-1">
              — immediate renewal action required.
            </span>
          </p>
        </div>
      )}

      {/* Projects */}
      {projects.length === 0 ? (
        <EmptyState
          icon="ShieldCheck"
          title="No RERA Projects Yet"
          hint="Add your first RERA-registered project to start tracking compliance, documents, and deadlines."
          action={
            <button onClick={() => setShowModal(true)} className="btn btn-primary gap-2">
              <Icon name="Plus" size={16} />
              Add Project
            </button>
          }
        />
      ) : (
        <div className="grid lg:grid-cols-2 gap-4">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} onUpdated={refresh} />
          ))}
        </div>
      )}

      {showModal && (
        <AddProjectModal
          onClose={() => setShowModal(false)}
          onCreated={refresh}
        />
      )}
    </div>
  );
}
