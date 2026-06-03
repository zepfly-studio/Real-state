"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  PageHeader,
  KPICard,
  Badge,
  EmptyState,
} from "@/components/ui";
import { Icon } from "@/components/Icon";
import { inr, inrFull, initials, timeAgo } from "@/lib/format";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Commission {
  id: string;
  tenantId: string;
  partnerId: string;
  leadName: string;
  dealValue: number;
  rate: number;
  amount: number;
  status: "PENDING" | "APPROVED" | "PAID";
  createdAt: string;
}

interface Partner {
  id: string;
  name: string;
  firm?: string | null;
  phone: string;
  email?: string | null;
  rera?: string | null;
  totalDeals: number;
  totalValue: number;
  createdAt: string;
  commissions: Commission[];
}

interface AllCommission extends Commission {
  partner: { id: string; name: string; firm?: string | null };
}

interface Props {
  partners: Partner[];
  commissions: AllCommission[];
  isChannelPartner: boolean;
  isMgmt: boolean;
  tenantId: string;
  userId: string;
}

// ─── Status badge helper ──────────────────────────────────────────────────────

function statusTone(s: string): "gold" | "green" | "blue" | "neutral" {
  if (s === "PENDING") return "gold";
  if (s === "APPROVED") return "blue";
  if (s === "PAID") return "green";
  return "neutral";
}

// ─── Add Partner Modal ────────────────────────────────────────────────────────

function AddPartnerModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ name: "", firm: "", phone: "", email: "", rera: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/partners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? "Failed to create partner");
      } else {
        onSaved();
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="card p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display font-bold text-lg">Onboard Channel Partner</h3>
          <button onClick={onClose} className="btn btn-ghost p-1.5"><Icon name="X" size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="field-label">Full Name *</label>
            <input
              className="input w-full"
              placeholder="Rahul Mehta"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="field-label">Firm / Agency</label>
            <input
              className="input w-full"
              placeholder="Mehta Properties"
              value={form.firm}
              onChange={(e) => setForm((f) => ({ ...f, firm: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="field-label">Phone *</label>
              <input
                className="input w-full"
                placeholder="+91 98765 43210"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="field-label">Email</label>
              <input
                className="input w-full"
                placeholder="rahul@mehta.com"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <label className="field-label">RERA Number</label>
            <input
              className="input w-full"
              placeholder="RAJ/CP/2024/001"
              value={form.rera}
              onChange={(e) => setForm((f) => ({ ...f, rera: e.target.value }))}
            />
          </div>
          {error && <p className="text-red text-sm">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn btn-ghost flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn btn-primary flex-1">
              {saving ? "Saving…" : "Add Partner"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Add Deal Modal ───────────────────────────────────────────────────────────

function AddDealModal({
  partners,
  onClose,
  onSaved,
}: {
  partners: Partner[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    partnerId: partners[0]?.id ?? "",
    leadName: "",
    dealValue: "",
    rate: "2",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const computedAmount = form.dealValue && form.rate
    ? (parseFloat(form.dealValue) * parseFloat(form.rate)) / 100
    : 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/partners/commission", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partnerId: form.partnerId,
          leadName: form.leadName,
          dealValue: parseFloat(form.dealValue),
          rate: parseFloat(form.rate),
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? "Failed to add deal");
      } else {
        onSaved();
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="card p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display font-bold text-lg">Add Deal / Commission</h3>
          <button onClick={onClose} className="btn btn-ghost p-1.5"><Icon name="X" size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="field-label">Partner *</label>
            <select
              className="input w-full"
              value={form.partnerId}
              onChange={(e) => setForm((f) => ({ ...f, partnerId: e.target.value }))}
              required
            >
              {partners.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}{p.firm ? ` — ${p.firm}` : ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label">Client / Lead Name *</label>
            <input
              className="input w-full"
              placeholder="Ravi Sharma"
              value={form.leadName}
              onChange={(e) => setForm((f) => ({ ...f, leadName: e.target.value }))}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="field-label">Deal Value (₹) *</label>
              <input
                className="input w-full"
                type="number"
                min="0"
                step="1"
                placeholder="6500000"
                value={form.dealValue}
                onChange={(e) => setForm((f) => ({ ...f, dealValue: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="field-label">Commission Rate (%)</label>
              <input
                className="input w-full"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={form.rate}
                onChange={(e) => setForm((f) => ({ ...f, rate: e.target.value }))}
              />
            </div>
          </div>
          {computedAmount > 0 && (
            <div className="p-3 bg-gold-soft/20 rounded-lg flex items-center gap-2 text-sm">
              <Icon name="Calculator" size={15} className="text-gold-bright" />
              <span className="text-txt-dim">Commission payable:</span>
              <span className="font-bold text-gold-bright">{inrFull(computedAmount)}</span>
            </div>
          )}
          {error && <p className="text-red text-sm">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn btn-ghost flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn btn-primary flex-1">
              {saving ? "Saving…" : "Add Deal"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

type Tab = "overview" | "ledger" | "leaderboard";

export function PartnersClient({
  partners,
  commissions,
  isChannelPartner,
  isMgmt,
  tenantId,
  userId,
}: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>(isChannelPartner ? "ledger" : "overview");
  const [showAddPartner, setShowAddPartner] = useState(false);
  const [showAddDeal, setShowAddDeal] = useState(false);
  const [statusLoading, setStatusLoading] = useState<string | null>(null);

  // KPI aggregates
  const activePartners = partners.length;
  const allCommissions: Commission[] = isMgmt
    ? (commissions as Commission[])
    : partners.flatMap((p) => p.commissions);

  const totalPaid = allCommissions
    .filter((c) => c.status === "PAID")
    .reduce((s, c) => s + c.amount, 0);
  const totalPending = allCommissions
    .filter((c) => c.status === "PENDING" || c.status === "APPROVED")
    .reduce((s, c) => s + c.amount, 0);
  const totalDealValue = allCommissions.reduce((s, c) => s + c.dealValue, 0);

  // For CHANNEL_PARTNER self-view
  const myPartner = isChannelPartner ? partners[0] : null;
  const myCommissions = myPartner?.commissions ?? [];

  async function handleStatusChange(id: string, status: "PENDING" | "APPROVED" | "PAID") {
    setStatusLoading(id);
    try {
      await fetch(`/api/partners/commission/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      router.refresh();
    } catch {
      // never throw
    } finally {
      setStatusLoading(null);
    }
  }

  function handleSaved() {
    setShowAddPartner(false);
    setShowAddDeal(false);
    router.refresh();
  }

  // ── Channel Partner self-view ─────────────────────────────────────────────
  if (isChannelPartner) {
    const earnedTotal = myCommissions
      .filter((c) => c.status === "PAID")
      .reduce((s, c) => s + c.amount, 0);
    const pendingTotal = myCommissions
      .filter((c) => c.status !== "PAID")
      .reduce((s, c) => s + c.amount, 0);

    // Rank among all partners (by totalValue) — injected as partners array
    const allPartners = partners;
    const myIdx = allPartners.findIndex((p) => p.id === myPartner?.id);
    const rank = myIdx >= 0 ? myIdx + 1 : 1;

    return (
      <div>
        <PageHeader
          title="My Partner Dashboard"
          subtitle="Your deals, commissions, and performance at a glance."
          icon="Handshake"
        />

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <KPICard label="My Deals" value={String(myCommissions.length)} icon="Briefcase" accent="gold" />
          <KPICard label="Total Deal Value" value={inr(myPartner?.totalValue ?? 0)} icon="IndianRupee" accent="blue" />
          <KPICard label="Commission Earned" value={inr(earnedTotal)} icon="Wallet" accent="green" />
          <KPICard label="Pending Payout" value={inr(pendingTotal)} icon="Clock" accent="purple" />
        </div>

        <div className="grid lg:grid-cols-3 gap-4 mb-6">
          {/* Profile card */}
          <Card className="p-5 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div
                className="grid place-items-center w-12 h-12 rounded-full text-lg font-bold"
                style={{ background: "#d9a441", color: "#0f1219" }}
              >
                {initials(myPartner?.name ?? "?")}
              </div>
              <div>
                <div className="font-display font-bold text-base">{myPartner?.name}</div>
                {myPartner?.firm && <div className="text-txt-dim text-sm">{myPartner.firm}</div>}
              </div>
            </div>
            <div className="space-y-2 text-sm mt-1">
              {myPartner?.phone && (
                <div className="flex gap-2 items-center text-txt-dim">
                  <Icon name="Phone" size={14} className="text-gold-bright" />
                  {myPartner.phone}
                </div>
              )}
              {myPartner?.email && (
                <div className="flex gap-2 items-center text-txt-dim">
                  <Icon name="Mail" size={14} className="text-gold-bright" />
                  {myPartner.email}
                </div>
              )}
              {myPartner?.rera && (
                <div className="flex gap-2 items-center text-txt-dim">
                  <Icon name="ShieldCheck" size={14} className="text-gold-bright" />
                  RERA: {myPartner.rera}
                </div>
              )}
            </div>
            {rank > 0 && (
              <div className="flex items-center gap-2 mt-2 p-2.5 bg-gold-soft/20 rounded-lg">
                <Icon name="Trophy" size={16} className="text-gold-bright" />
                <span className="text-sm font-semibold text-gold-bright">Rank #{rank} Partner</span>
              </div>
            )}
          </Card>

          {/* My Deals Table */}
          <Card className="lg:col-span-2 p-5">
            <h3 className="font-display font-bold text-base mb-4">My Deals & Commissions</h3>
            {myCommissions.length === 0 ? (
              <EmptyState icon="Briefcase" title="No deals yet" hint="Your referred deals will appear here once added by the team." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-line text-txt-faint text-xs uppercase tracking-wide text-left">
                      <th className="pb-3 pr-4 font-semibold">Client</th>
                      <th className="pb-3 pr-4 font-semibold text-right">Deal Value</th>
                      <th className="pb-3 pr-4 font-semibold text-right">Rate</th>
                      <th className="pb-3 pr-4 font-semibold text-right">Commission</th>
                      <th className="pb-3 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myCommissions.map((c) => (
                      <tr key={c.id} className="border-b border-line/30 hover:bg-panel-2/50 transition-colors">
                        <td className="py-3 pr-4">
                          <div className="font-medium">{c.leadName}</div>
                          <div className="text-xs text-txt-faint">{timeAgo(c.createdAt)}</div>
                        </td>
                        <td className="py-3 pr-4 text-right font-medium">{inr(c.dealValue)}</td>
                        <td className="py-3 pr-4 text-right text-txt-dim">{c.rate}%</td>
                        <td className="py-3 pr-4 text-right text-gold-bright font-semibold">{inr(c.amount)}</td>
                        <td className="py-3">
                          <Badge tone={statusTone(c.status)}>{c.status}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      </div>
    );
  }

  // ── Management view ───────────────────────────────────────────────────────

  const ledgerRows: AllCommission[] = commissions.length > 0
    ? commissions
    : partners.flatMap((p) =>
        p.commissions.map((c) => ({
          ...c,
          partner: { id: p.id, name: p.name, firm: p.firm ?? null },
        }))
      );

  // Build leaderboard from partners
  const leaderboard = [...partners]
    .sort((a, b) => b.totalValue - a.totalValue)
    .map((p, i) => ({
      ...p,
      rank: i + 1,
      earned: p.commissions.filter((c) => c.status === "PAID").reduce((s, c) => s + c.amount, 0),
    }));

  const maxValue = leaderboard[0]?.totalValue ?? 1;
  const MEDALS = ["🥇", "🥈", "🥉"];

  return (
    <div>
      <PageHeader
        title="Channel Partners"
        subtitle="Manage broker network, track referrals and commissions."
        icon="Handshake"
        actions={
          isMgmt ? (
            <div className="flex gap-2">
              <button
                onClick={() => setShowAddDeal(true)}
                className="btn btn-ghost flex items-center gap-2"
              >
                <Icon name="Plus" size={15} />
                Add Deal
              </button>
              <button
                onClick={() => setShowAddPartner(true)}
                className="btn btn-primary flex items-center gap-2"
              >
                <Icon name="UserPlus" size={15} />
                Add Partner
              </button>
            </div>
          ) : null
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPICard label="Active Partners" value={String(activePartners)} icon="Users" accent="gold" />
        <KPICard label="Total Deal Value" value={inr(totalDealValue)} icon="IndianRupee" accent="blue" />
        <KPICard label="Commission Paid" value={inr(totalPaid)} icon="CheckCircle" accent="green" />
        <KPICard label="Pending Payout" value={inr(totalPending)} icon="Clock" accent="purple" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 p-1 bg-bg-2 rounded-xl w-fit">
        {(["overview", "ledger", "leaderboard"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all capitalize ${
              tab === t ? "bg-gold text-[#0f1219]" : "text-txt-dim hover:text-txt"
            }`}
          >
            {t === "overview" ? "Partners" : t === "ledger" ? "Commission Ledger" : "Leaderboard"}
          </button>
        ))}
      </div>

      {/* ── Tab: Overview (partner cards) ──────────────────────────────────── */}
      {tab === "overview" && (
        <>
          {partners.length === 0 ? (
            <EmptyState
              icon="Handshake"
              title="No channel partners yet"
              hint="Onboard your first broker or channel partner to start tracking referrals."
              action={
                isMgmt ? (
                  <button onClick={() => setShowAddPartner(true)} className="btn btn-primary">
                    Add Partner
                  </button>
                ) : undefined
              }
            />
          ) : (
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
              {partners.map((p) => {
                const earned = p.commissions
                  .filter((c) => c.status === "PAID")
                  .reduce((s, c) => s + c.amount, 0);
                const pending = p.commissions
                  .filter((c) => c.status !== "PAID")
                  .reduce((s, c) => s + c.amount, 0);
                const rankIdx = leaderboard.findIndex((l) => l.id === p.id);
                const medal = rankIdx < 3 ? MEDALS[rankIdx] : null;
                return (
                  <Card key={p.id} className="p-5">
                    <div className="flex items-start gap-3 mb-4">
                      <div
                        className="grid place-items-center w-11 h-11 rounded-full text-base font-bold flex-shrink-0"
                        style={{ background: "#d9a441", color: "#0f1219" }}
                      >
                        {initials(p.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-display font-bold truncate">{p.name}</span>
                          {medal && <span className="text-base">{medal}</span>}
                        </div>
                        {p.firm && <div className="text-txt-dim text-xs">{p.firm}</div>}
                        {p.rera && (
                          <div className="text-txt-faint text-[11px] flex items-center gap-1 mt-0.5">
                            <Icon name="ShieldCheck" size={11} />
                            RERA: {p.rera}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mb-4">
                      <div className="text-center p-2 bg-panel-2 rounded-lg">
                        <div className="font-display font-bold text-base text-gold-bright">{p.totalDeals}</div>
                        <div className="text-[10px] text-txt-faint uppercase tracking-wide">Deals</div>
                      </div>
                      <div className="text-center p-2 bg-panel-2 rounded-lg">
                        <div className="font-display font-bold text-sm text-green">{inr(earned)}</div>
                        <div className="text-[10px] text-txt-faint uppercase tracking-wide">Paid</div>
                      </div>
                      <div className="text-center p-2 bg-panel-2 rounded-lg">
                        <div className="font-display font-bold text-sm text-purple">{inr(pending)}</div>
                        <div className="text-[10px] text-txt-faint uppercase tracking-wide">Pending</div>
                      </div>
                    </div>

                    {/* Progress bar: total value vs top partner */}
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="text-txt-faint">Total referred value</span>
                        <span className="font-semibold text-gold-bright">{inr(p.totalValue)}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-bg-2 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-gold to-gold-bright"
                          style={{ width: `${maxValue > 0 ? (p.totalValue / maxValue) * 100 : 0}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-3 mt-3 text-xs text-txt-faint">
                      {p.phone && (
                        <a href={`tel:${p.phone}`} className="flex items-center gap-1 hover:text-gold-bright transition-colors">
                          <Icon name="Phone" size={12} /> {p.phone}
                        </a>
                      )}
                      <span className="ml-auto">{timeAgo(p.createdAt)}</span>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── Tab: Commission Ledger ────────────────────────────────────────── */}
      {tab === "ledger" && (
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-bold text-base">Commission Ledger</h3>
            {isMgmt && (
              <button
                onClick={() => setShowAddDeal(true)}
                className="btn btn-primary text-sm flex items-center gap-1.5"
              >
                <Icon name="Plus" size={14} /> Add Deal
              </button>
            )}
          </div>
          {ledgerRows.length === 0 ? (
            <EmptyState icon="Receipt" title="No commission records" hint="Add a deal to start tracking commissions." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-txt-faint text-xs uppercase tracking-wide text-left">
                    <th className="pb-3 pr-4 font-semibold">Partner</th>
                    <th className="pb-3 pr-4 font-semibold">Client</th>
                    <th className="pb-3 pr-4 font-semibold text-right">Deal Value</th>
                    <th className="pb-3 pr-4 font-semibold text-right">Rate</th>
                    <th className="pb-3 pr-4 font-semibold text-right">Commission</th>
                    <th className="pb-3 pr-4 font-semibold">Status</th>
                    {isMgmt && <th className="pb-3 font-semibold">Action</th>}
                  </tr>
                </thead>
                <tbody>
                  {ledgerRows.map((c) => (
                    <tr key={c.id} className="border-b border-line/30 hover:bg-panel-2/50 transition-colors">
                      <td className="py-3 pr-4">
                        <div className="font-medium">{(c as AllCommission).partner?.name ?? "—"}</div>
                        {(c as AllCommission).partner?.firm && (
                          <div className="text-xs text-txt-faint">{(c as AllCommission).partner.firm}</div>
                        )}
                      </td>
                      <td className="py-3 pr-4">
                        <div>{c.leadName}</div>
                        <div className="text-xs text-txt-faint">{timeAgo(c.createdAt)}</div>
                      </td>
                      <td className="py-3 pr-4 text-right font-medium">{inr(c.dealValue)}</td>
                      <td className="py-3 pr-4 text-right text-txt-dim">{c.rate}%</td>
                      <td className="py-3 pr-4 text-right font-semibold text-gold-bright">{inrFull(c.amount)}</td>
                      <td className="py-3 pr-4">
                        <Badge tone={statusTone(c.status)}>{c.status}</Badge>
                      </td>
                      {isMgmt && (
                        <td className="py-3">
                          {statusLoading === c.id ? (
                            <span className="text-xs text-txt-faint">Updating…</span>
                          ) : (
                            <div className="flex gap-1">
                              {c.status === "PENDING" && (
                                <button
                                  onClick={() => handleStatusChange(c.id, "APPROVED")}
                                  className="btn btn-ghost text-xs py-1 px-2 text-blue hover:bg-blue/10"
                                >
                                  Approve
                                </button>
                              )}
                              {(c.status === "PENDING" || c.status === "APPROVED") && (
                                <button
                                  onClick={() => handleStatusChange(c.id, "PAID")}
                                  className="btn btn-ghost text-xs py-1 px-2 text-green hover:bg-green/10"
                                >
                                  Mark Paid
                                </button>
                              )}
                              {c.status === "PAID" && (
                                <span className="text-xs text-green flex items-center gap-1">
                                  <Icon name="CheckCircle2" size={13} /> Paid
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* ── Tab: Leaderboard ─────────────────────────────────────────────── */}
      {tab === "leaderboard" && (
        <div className="space-y-4">
          {leaderboard.length === 0 ? (
            <EmptyState icon="Trophy" title="No partners yet" hint="Onboard partners to see the leaderboard." />
          ) : (
            leaderboard.map((p, i) => (
              <Card key={p.id} className={`p-4 ${i === 0 ? "border-gold-bright/30 bg-gold-soft/5" : ""}`}>
                <div className="flex items-center gap-4">
                  <div className="text-2xl w-10 text-center flex-shrink-0">
                    {i < 3 ? MEDALS[i] : <span className="font-display font-bold text-txt-faint text-lg">#{i + 1}</span>}
                  </div>
                  <div
                    className="grid place-items-center w-10 h-10 rounded-full text-sm font-bold flex-shrink-0"
                    style={{ background: i === 0 ? "#d9a441" : i === 1 ? "#9b7ef0" : i === 2 ? "#5b8def" : "#64748b", color: "#ffffff" }}
                  >
                    {initials(p.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div>
                        <span className="font-semibold">{p.name}</span>
                        {p.firm && <span className="text-txt-faint text-xs ml-2">{p.firm}</span>}
                      </div>
                      <div className="text-right">
                        <div className="font-display font-bold text-gold-bright">{inr(p.totalValue)}</div>
                        <div className="text-xs text-txt-faint">{p.totalDeals} deal{p.totalDeals !== 1 ? "s" : ""}</div>
                      </div>
                    </div>
                    <div className="h-2 rounded-full bg-bg-2 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-gold to-gold-bright"
                        style={{ width: `${maxValue > 0 ? (p.totalValue / maxValue) * 100 : 0}%` }}
                      />
                    </div>
                    <div className="flex gap-4 mt-2 text-xs text-txt-dim">
                      <span>
                        <span className="text-green font-semibold">{inr(p.earned)}</span> earned
                      </span>
                      <span>
                        <span className="text-purple font-semibold">
                          {inr(p.commissions.filter((c) => c.status !== "PAID").reduce((s, c) => s + c.amount, 0))}
                        </span>{" "}
                        pending
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Modals */}
      {showAddPartner && (
        <AddPartnerModal onClose={() => setShowAddPartner(false)} onSaved={handleSaved} />
      )}
      {showAddDeal && partners.length > 0 && (
        <AddDealModal
          partners={partners}
          onClose={() => setShowAddDeal(false)}
          onSaved={handleSaved}
        />
      )}
      {showAddDeal && partners.length === 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <Card className="p-6 max-w-sm text-center">
            <Icon name="AlertCircle" size={32} className="text-gold-bright mx-auto mb-3" />
            <h3 className="font-display font-semibold mb-2">No Partners Yet</h3>
            <p className="text-txt-dim text-sm mb-4">Please add a partner before adding a deal.</p>
            <button onClick={() => setShowAddDeal(false)} className="btn btn-primary w-full">Got it</button>
          </Card>
        </div>
      )}
    </div>
  );
}
