"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, PageHeader, Badge, EmptyState } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { timeAgo } from "@/lib/format";

type Policy = {
  id: string;
  category: string;
  title: string;
  body: string;
  updatedAt: string;
};

type Props = {
  policies: Policy[];
  canEdit: boolean;
};

const CATEGORIES = ["ALL", "HR", "LEAVE", "SALES", "CONDUCT"];

const CATEGORY_META: Record<string, { label: string; icon: string; tone: "gold" | "green" | "blue" | "purple" | "red" | "neutral" }> = {
  HR: { label: "HR", icon: "Users", tone: "blue" },
  LEAVE: { label: "Leave", icon: "CalendarOff", tone: "gold" },
  SALES: { label: "Sales", icon: "TrendingUp", tone: "green" },
  CONDUCT: { label: "Conduct", icon: "ShieldCheck", tone: "purple" },
};

// ─────────── Policy Modal ───────────
function PolicyModal({
  policy,
  onClose,
  onSaved,
}: {
  policy?: Policy;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(policy?.title ?? "");
  const [category, setCategory] = useState(policy?.category ?? "HR");
  const [body, setBody] = useState(policy?.body ?? "");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !body.trim()) {
      setErr("Title and body are required.");
      return;
    }
    setSaving(true);
    try {
      const url = policy ? `/api/policies/${policy.id}` : "/api/policies";
      const method = policy ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), category, body: body.trim() }),
      });
      if (!res.ok) throw new Error(await res.text());
      onSaved();
    } catch (e: any) {
      setErr(e.message || "Failed to save.");
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="card w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display font-bold text-lg">
            {policy ? "Edit Policy" : "Add Policy"}
          </h3>
          <button className="btn btn-ghost p-1.5" onClick={onClose}>
            <Icon name="X" size={18} />
          </button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="field-label">Title</label>
              <input
                className="input w-full"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Policy title…"
                autoFocus
              />
            </div>
            <div>
              <label className="field-label">Category</label>
              <select
                className="input w-full"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {["HR", "LEAVE", "SALES", "CONDUCT"].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="field-label">Body</label>
            <textarea
              className="input w-full min-h-[200px] resize-y font-mono text-sm"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write policy content here… Markdown is supported."
            />
          </div>
          {err && <p className="text-red text-sm">{err}</p>}
          <div className="flex gap-2 pt-1">
            <button type="button" className="btn btn-ghost flex-1" onClick={onClose}>
              Cancel
            </button>
            <button className="btn btn-primary flex-1" disabled={saving}>
              {saving ? "Saving…" : policy ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─────────── Reading Pane ───────────
function ReadingPane({
  policy,
  canEdit,
  onEdit,
  onDelete,
}: {
  policy: Policy;
  canEdit: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const meta = CATEGORY_META[policy.category] ?? { label: policy.category, icon: "FileText", tone: "neutral" as const };

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="flex items-start gap-3 mb-6">
        <div className="grid place-items-center w-10 h-10 rounded-xl bg-gold-soft text-gold-bright shrink-0 mt-0.5">
          <Icon name={meta.icon} size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <Badge tone={meta.tone}>{meta.label}</Badge>
          <h2 className="font-display font-bold text-xl mt-1.5 leading-tight">{policy.title}</h2>
          <p className="text-txt-faint text-xs mt-1">Updated {timeAgo(policy.updatedAt)}</p>
        </div>
        {canEdit && (
          <div className="flex gap-2 shrink-0">
            <button className="btn btn-ghost text-xs gap-1.5" onClick={onEdit}>
              <Icon name="Pencil" size={13} />
              Edit
            </button>
            <button className="btn btn-ghost text-xs gap-1.5 text-red" onClick={onDelete}>
              <Icon name="Trash2" size={13} />
            </button>
          </div>
        )}
      </div>
      <div className="prose prose-sm max-w-none">
        {policy.body.split("\n").map((line, i) => {
          if (line.startsWith("# ")) {
            return <h1 key={i} className="font-display font-bold text-lg mt-4 mb-2">{line.slice(2)}</h1>;
          }
          if (line.startsWith("## ")) {
            return <h2 key={i} className="font-display font-semibold text-base mt-3 mb-1.5">{line.slice(3)}</h2>;
          }
          if (line.startsWith("### ")) {
            return <h3 key={i} className="font-semibold text-sm mt-2 mb-1">{line.slice(4)}</h3>;
          }
          if (line.startsWith("- ") || line.startsWith("* ")) {
            return (
              <li key={i} className="text-txt-dim text-sm ml-4 list-disc leading-relaxed">
                {line.slice(2)}
              </li>
            );
          }
          if (line.trim() === "") {
            return <div key={i} className="h-2" />;
          }
          return (
            <p key={i} className="text-txt-dim text-sm leading-relaxed">
              {line}
            </p>
          );
        })}
      </div>
    </div>
  );
}

// ─────────── Main Component ───────────
export default function PoliciesClient({ policies: initialPolicies, canEdit }: Props) {
  const router = useRouter();
  const [policies, setPolicies] = useState<Policy[]>(initialPolicies);
  const [activeCategory, setActiveCategory] = useState("ALL");
  const [selectedId, setSelectedId] = useState<string | null>(
    initialPolicies[0]?.id ?? null
  );
  const [showModal, setShowModal] = useState(false);
  const [editPolicy, setEditPolicy] = useState<Policy | undefined>(undefined);

  const filtered =
    activeCategory === "ALL"
      ? policies
      : policies.filter((p) => p.category === activeCategory);

  const selected = policies.find((p) => p.id === selectedId) ?? filtered[0] ?? null;

  function handleSaved() {
    setShowModal(false);
    setEditPolicy(undefined);
    router.refresh();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this policy? This cannot be undone.")) return;
    await fetch(`/api/policies/${id}`, { method: "DELETE" });
    setPolicies((prev) => prev.filter((p) => p.id !== id));
    if (selectedId === id) setSelectedId(filtered.find((p) => p.id !== id)?.id ?? null);
  }

  return (
    <div>
      <PageHeader
        title="Company Policies"
        subtitle="All policies in one place — HR, Leave, Sales, and Conduct."
        icon="BookOpen"
        actions={
          canEdit ? (
            <button
              className="btn btn-primary gap-2"
              onClick={() => { setEditPolicy(undefined); setShowModal(true); }}
            >
              <Icon name="Plus" size={15} />
              Add Policy
            </button>
          ) : undefined
        }
      />

      <div className="flex gap-4 min-h-[70vh]">
        {/* Left Rail */}
        <div className="w-64 shrink-0 flex flex-col gap-2">
          {/* Category tabs */}
          <div className="card p-2 flex flex-col gap-1 mb-1">
            {CATEGORIES.map((cat) => {
              const meta = CATEGORY_META[cat];
              const count = cat === "ALL"
                ? policies.length
                : policies.filter((p) => p.category === cat).length;
              return (
                <button
                  key={cat}
                  onClick={() => { setActiveCategory(cat); }}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left ${
                    activeCategory === cat
                      ? "bg-gold-soft text-gold-bright"
                      : "text-txt-dim hover:bg-panel-2"
                  }`}
                >
                  <Icon name={meta?.icon ?? "Layers"} size={14} />
                  <span className="flex-1">{cat === "ALL" ? "All Policies" : meta?.label ?? cat}</span>
                  <span className={`text-[11px] rounded-full px-1.5 py-0.5 ${
                    activeCategory === cat ? "bg-gold/20 text-gold-bright" : "bg-bg-2 text-txt-faint"
                  }`}>{count}</span>
                </button>
              );
            })}
          </div>

          {/* Policy list */}
          <div className="flex flex-col gap-1.5 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="text-txt-faint text-xs text-center py-6">No policies yet.</div>
            ) : (
              filtered.map((p) => {
                const meta = CATEGORY_META[p.category];
                return (
                  <button
                    key={p.id}
                    onClick={() => setSelectedId(p.id)}
                    className={`text-left card p-3 transition-all ${
                      selectedId === p.id
                        ? "border-gold/40 bg-gold-soft/10"
                        : "hover:bg-panel-2"
                    }`}
                  >
                    <div className="text-[13px] font-semibold leading-snug truncate">{p.title}</div>
                    <div className="flex items-center gap-1.5 mt-1">
                      <Badge tone={meta?.tone ?? "neutral"}>{p.category}</Badge>
                      <span className="text-[11px] text-txt-faint">{timeAgo(p.updatedAt)}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Reading Pane */}
        <div className="flex-1 card overflow-hidden">
          {selected ? (
            <ReadingPane
              policy={selected}
              canEdit={canEdit}
              onEdit={() => { setEditPolicy(selected); setShowModal(true); }}
              onDelete={() => handleDelete(selected.id)}
            />
          ) : (
            <EmptyState
              icon="BookOpen"
              title="Select a policy"
              hint="Choose a policy from the left to read it here."
              action={
                canEdit ? (
                  <button
                    className="btn btn-primary"
                    onClick={() => { setEditPolicy(undefined); setShowModal(true); }}
                  >
                    Create First Policy
                  </button>
                ) : undefined
              }
            />
          )}
        </div>
      </div>

      {showModal && (
        <PolicyModal
          policy={editPolicy}
          onClose={() => { setShowModal(false); setEditPolicy(undefined); }}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
