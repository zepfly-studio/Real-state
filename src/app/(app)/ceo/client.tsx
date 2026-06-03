"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, KPICard, PageHeader, Badge, EmptyState } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { inr, inrFull, timeAgo } from "@/lib/format";

type CeoNote = {
  id: string;
  category: string;
  title: string;
  body: string;
  amount: number | null;
  createdAt: string;
};

type Overview = {
  totalRevenue: number;
  activeLeads: number;
  headcount: number;
  bookingsMTD: number;
  conversionRate: number;
  closedWon: number;
};

type Props = {
  notes: CeoNote[];
  overview: Overview;
  userId: string;
};

const CATEGORY_COLORS: Record<string, string> = {
  INVESTMENT: "gold",
  IDEA: "purple",
  HEALTH: "green",
  NOTE: "blue",
  OVERVIEW: "neutral",
};

const CATEGORY_ICONS: Record<string, string> = {
  INVESTMENT: "TrendingUp",
  IDEA: "Lightbulb",
  HEALTH: "HeartPulse",
  NOTE: "StickyNote",
  OVERVIEW: "BarChart2",
};

// ─────────── Modal ───────────
function AddNoteModal({
  category,
  onClose,
  onSaved,
}: {
  category: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { setErr("Title is required."); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/ceo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          title: title.trim(),
          body: body.trim(),
          amount: amount ? parseFloat(amount) : undefined,
        }),
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
      <div className="card w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display font-bold text-lg">
            Add {category === "INVESTMENT" ? "Investment" : category === "IDEA" ? "Idea" : category === "HEALTH" ? "Health Log" : "Note"}
          </h3>
          <button className="btn btn-ghost p-1.5" onClick={onClose}>
            <Icon name="X" size={18} />
          </button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="field-label">Title</label>
            <input
              className="input w-full"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title…"
              autoFocus
            />
          </div>
          <div>
            <label className="field-label">Details</label>
            <textarea
              className="input w-full min-h-[80px] resize-none"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Add notes, details…"
            />
          </div>
          {(category === "INVESTMENT" || category === "OVERVIEW") && (
            <div>
              <label className="field-label">Amount (₹)</label>
              <input
                className="input w-full"
                type="number"
                min={0}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 5000000"
              />
            </div>
          )}
          {err && <p className="text-red text-sm">{err}</p>}
          <div className="flex gap-2 pt-1">
            <button type="button" className="btn btn-ghost flex-1" onClick={onClose}>
              Cancel
            </button>
            <button className="btn btn-primary flex-1" disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─────────── Section header ───────────
function SectionHeader({ icon, title, onAdd }: { icon: string; title: string; onAdd?: () => void }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <div className="grid place-items-center w-8 h-8 rounded-lg bg-gold-soft text-gold-bright">
          <Icon name={icon} size={15} />
        </div>
        <h3 className="font-display font-bold text-base">{title}</h3>
      </div>
      {onAdd && (
        <button
          className="btn btn-ghost text-xs gap-1.5 h-8 px-3"
          onClick={onAdd}
        >
          <Icon name="Plus" size={13} />
          Add
        </button>
      )}
    </div>
  );
}

// ─────────── Note Card ───────────
function NoteCard({
  note,
  onDelete,
}: {
  note: CeoNote;
  onDelete: (id: string) => void;
}) {
  const [deleting, setDeleting] = useState(false);
  async function handleDelete() {
    if (!confirm("Delete this entry?")) return;
    setDeleting(true);
    await fetch(`/api/ceo/${note.id}`, { method: "DELETE" });
    onDelete(note.id);
  }
  return (
    <div className="card p-4 group relative">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm leading-snug truncate">{note.title}</div>
          {note.amount && (
            <div className="text-gold-bright font-display font-bold text-base mt-0.5">
              {inr(note.amount)}
            </div>
          )}
          {note.body && (
            <p className="text-txt-dim text-xs mt-1.5 leading-relaxed line-clamp-3">{note.body}</p>
          )}
          <div className="text-txt-faint text-[11px] mt-2">{timeAgo(note.createdAt)}</div>
        </div>
        <button
          className="opacity-0 group-hover:opacity-100 transition-opacity btn btn-ghost p-1 text-red shrink-0"
          onClick={handleDelete}
          disabled={deleting}
          title="Delete"
        >
          <Icon name="Trash2" size={14} />
        </button>
      </div>
    </div>
  );
}

// ─────────── Balance Sheet ───────────
function BalanceSheet({
  investments,
  revenue,
}: {
  investments: CeoNote[];
  revenue: number;
}) {
  const totalInvested = investments.reduce((s, n) => s + (n.amount || 0), 0);
  // Demo balance-sheet figures
  const assets = [
    { label: "Inventory (Property Stock)", value: 22_50_00_000 },
    { label: "Collected Revenue", value: revenue },
    { label: "Fixed Deposits & Bonds", value: 3_50_00_000 },
    { label: "Total Investments", value: totalInvested || 8_00_00_000 },
  ];
  const liabilities = [
    { label: "Bank Loan (Project Finance)", value: 15_00_00_000 },
    { label: "Payables & Advances", value: 1_80_00_000 },
    { label: "GST / Tax Provisions", value: 90_00_000 },
  ];
  const totalAssets = assets.reduce((s, a) => s + a.value, 0);
  const totalLiab = liabilities.reduce((s, l) => s + l.value, 0);
  const netWorth = totalAssets - totalLiab;

  return (
    <Card className="p-5">
      <SectionHeader icon="Scale" title="Balance-Sheet Summary" />
      <div className="grid md:grid-cols-2 gap-4 mb-4">
        <div>
          <div className="text-[11px] uppercase tracking-wide text-green font-semibold mb-2">Assets</div>
          <div className="space-y-2">
            {assets.map((a) => (
              <div key={a.label} className="flex items-center justify-between text-sm">
                <span className="text-txt-dim truncate pr-2">{a.label}</span>
                <span className="font-semibold text-txt shrink-0">{inr(a.value)}</span>
              </div>
            ))}
            <div className="border-t border-line pt-2 flex items-center justify-between text-sm font-bold">
              <span>Total Assets</span>
              <span className="text-green">{inr(totalAssets)}</span>
            </div>
          </div>
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-wide text-red font-semibold mb-2">Liabilities</div>
          <div className="space-y-2">
            {liabilities.map((l) => (
              <div key={l.label} className="flex items-center justify-between text-sm">
                <span className="text-txt-dim truncate pr-2">{l.label}</span>
                <span className="font-semibold text-txt shrink-0">{inr(l.value)}</span>
              </div>
            ))}
            <div className="border-t border-line pt-2 flex items-center justify-between text-sm font-bold">
              <span>Total Liabilities</span>
              <span className="text-red">{inr(totalLiab)}</span>
            </div>
          </div>
        </div>
      </div>
      <div className="rounded-xl bg-gold-soft/30 border border-gold/30 p-4 flex items-center justify-between">
        <span className="font-display font-bold text-sm">Net Worth (Equity)</span>
        <span className="font-display font-bold text-xl text-gold-bright">{inr(netWorth)}</span>
      </div>
      <p className="text-txt-faint text-[11px] mt-2 text-right">* Demo figures — connect live data for accuracy</p>
    </Card>
  );
}

// ─────────── Main Component ───────────
export default function CeoDashboard({ notes, overview, userId }: Props) {
  const router = useRouter();
  const [modal, setModal] = useState<string | null>(null);
  const [localNotes, setLocalNotes] = useState<CeoNote[]>(notes);

  function notesByCategory(cat: string) {
    return localNotes.filter((n) => n.category === cat);
  }

  function handleSaved() {
    setModal(null);
    router.refresh();
  }

  function handleDelete(id: string) {
    setLocalNotes((prev) => prev.filter((n) => n.id !== id));
  }

  const investments = notesByCategory("INVESTMENT");
  const ideas = notesByCategory("IDEA");
  const healthLogs = notesByCategory("HEALTH");
  const personalNotes = notesByCategory("NOTE");

  const totalInvested = investments.reduce((s, n) => s + (n.amount || 0), 0);

  return (
    <div>
      <PageHeader
        title="CEO Space"
        subtitle="Private founder dashboard — visible to admin only."
        icon="Crown"
      />

      {/* Business Overview KPIs */}
      <section className="mb-8">
        <div className="section-label mb-3">Business Overview</div>
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          <KPICard
            label="Total Revenue"
            value={inr(overview.totalRevenue)}
            delta="+12.4%"
            icon="IndianRupee"
            accent="gold"
          />
          <KPICard
            label="Active Leads"
            value={String(overview.activeLeads)}
            delta="+8.1%"
            icon="Users"
            accent="blue"
          />
          <KPICard
            label="Bookings MTD"
            value={String(overview.bookingsMTD)}
            delta="+3"
            icon="FileCheck2"
            accent="green"
          />
          <KPICard
            label="Headcount"
            value={String(overview.headcount)}
            icon="Building2"
            accent="purple"
          />
          <KPICard
            label="Conversion"
            value={`${overview.conversionRate}%`}
            delta="+1.9%"
            icon="TrendingUp"
            accent="gold"
          />
          <KPICard
            label="Closed Won"
            value={String(overview.closedWon)}
            icon="CheckCircle2"
            accent="green"
          />
        </div>
      </section>

      {/* Investment Tracker */}
      <section className="mb-6">
        <Card className="p-5">
          <SectionHeader
            icon="TrendingUp"
            title="Investments Tracker"
            onAdd={() => setModal("INVESTMENT")}
          />
          {investments.length === 0 ? (
            <EmptyState
              icon="TrendingUp"
              title="No investments tracked"
              hint="Add investment entries to track your portfolio."
              action={
                <button
                  className="btn btn-primary"
                  onClick={() => setModal("INVESTMENT")}
                >
                  Add Investment
                </button>
              }
            />
          ) : (
            <>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
                {investments.map((n) => (
                  <NoteCard key={n.id} note={n} onDelete={handleDelete} />
                ))}
              </div>
              <div className="rounded-xl bg-panel-2 px-4 py-3 flex items-center justify-between">
                <span className="text-txt-dim text-sm font-semibold">
                  Total Invested
                </span>
                <span className="font-display font-bold text-xl text-gold-bright">
                  {inr(totalInvested)}
                </span>
              </div>
            </>
          )}
        </Card>
      </section>

      {/* Balance Sheet */}
      <section className="mb-6">
        <BalanceSheet investments={investments} revenue={overview.totalRevenue} />
      </section>

      {/* Ideas Vault + Health Log side-by-side */}
      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Ideas Vault */}
        <Card className="p-5">
          <SectionHeader
            icon="Lightbulb"
            title="Ideas Vault"
            onAdd={() => setModal("IDEA")}
          />
          {ideas.length === 0 ? (
            <EmptyState
              icon="Lightbulb"
              title="No ideas yet"
              hint="Capture your next big idea."
            />
          ) : (
            <div className="grid gap-3">
              {ideas.map((n) => (
                <NoteCard key={n.id} note={n} onDelete={handleDelete} />
              ))}
            </div>
          )}
        </Card>

        {/* Health Log */}
        <Card className="p-5">
          <SectionHeader
            icon="HeartPulse"
            title="Health Log"
            onAdd={() => setModal("HEALTH")}
          />
          {healthLogs.length === 0 ? (
            <EmptyState
              icon="HeartPulse"
              title="No health entries"
              hint="Track your wellness, workouts, metrics."
            />
          ) : (
            <div className="space-y-3">
              {healthLogs.map((n) => (
                <NoteCard key={n.id} note={n} onDelete={handleDelete} />
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Personal Notes */}
      <section className="mb-6">
        <Card className="p-5">
          <SectionHeader
            icon="StickyNote"
            title="Personal Notes"
            onAdd={() => setModal("NOTE")}
          />
          {personalNotes.length === 0 ? (
            <EmptyState
              icon="StickyNote"
              title="No personal notes"
              hint="Private notes visible only to you."
            />
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {personalNotes.map((n) => (
                <NoteCard key={n.id} note={n} onDelete={handleDelete} />
              ))}
            </div>
          )}
        </Card>
      </section>

      {/* Add Note Modal */}
      {modal && (
        <AddNoteModal
          category={modal}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
