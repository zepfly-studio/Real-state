"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, PageHeader, EmptyState, KPICard } from "@/components/ui";
import { Icon } from "@/components/Icon";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from "recharts";

interface Competitor {
  id: string;
  name: string;
  project: string;
  location: string;
  pricePerSqft: number;
  amenities: string[];
  possession: string;
  createdAt: string;
}

// ─── Add Competitor Modal ─────────────────────────────────────────

function AddCompetitorModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState({
    name: "",
    project: "",
    location: "",
    pricePerSqft: "",
    amenities: "",
    possession: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.project || !form.pricePerSqft) {
      setError("Name, project, and price/sqft are required.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const amenitiesArr = form.amenities
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean);

      const res = await fetch("/api/competitors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          pricePerSqft: Number(form.pricePerSqft),
          amenities: amenitiesArr,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Failed to add competitor.");
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
          <h3 className="font-display font-bold text-lg">Add Competitor</h3>
          <button onClick={onClose} className="btn btn-ghost p-2">
            <Icon name="X" size={18} />
          </button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="field-label">Developer / Brand</label>
              <input
                className="input w-full"
                placeholder="e.g. Mahindra Lifespace"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <label className="field-label">Project Name</label>
              <input
                className="input w-full"
                placeholder="e.g. Happinest Jaipur"
                value={form.project}
                onChange={(e) => setForm({ ...form, project: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="field-label">Location</label>
              <input
                className="input w-full"
                placeholder="e.g. Jagatpura"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
              />
            </div>
            <div>
              <label className="field-label">Price / sqft (₹)</label>
              <input
                type="number"
                className="input w-full"
                placeholder="e.g. 4800"
                value={form.pricePerSqft}
                onChange={(e) => setForm({ ...form, pricePerSqft: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="field-label">Amenities (comma-separated)</label>
            <input
              className="input w-full"
              placeholder="Club House, Swimming Pool, Gym, 24x7 Security"
              value={form.amenities}
              onChange={(e) => setForm({ ...form, amenities: e.target.value })}
            />
          </div>
          <div>
            <label className="field-label">Possession Date</label>
            <input
              className="input w-full"
              placeholder="e.g. Dec 2026, Ready to Move"
              value={form.possession}
              onChange={(e) => setForm({ ...form, possession: e.target.value })}
            />
          </div>
          {error && <p className="text-red text-sm">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn btn-ghost flex-1">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn btn-primary flex-1">
              {loading ? "Adding…" : "Add Competitor"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Client Component ────────────────────────────────────────

export function CompetitorClient({
  competitors: initialCompetitors,
  tenantAvgPrice,
}: {
  competitors: Competitor[];
  tenantAvgPrice: number;
}) {
  const router = useRouter();
  const [competitors, setCompetitors] = useState(initialCompetitors);
  const [showModal, setShowModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function refresh() {
    router.refresh();
  }

  async function deleteCompetitor(id: string) {
    if (!confirm("Remove this competitor?")) return;
    setDeletingId(id);
    try {
      await fetch(`/api/competitors/${id}`, { method: "DELETE" });
      setCompetitors((prev) => prev.filter((c) => c.id !== id));
      router.refresh();
    } catch {
      // silent
    } finally {
      setDeletingId(null);
    }
  }

  // KPIs
  const avgMarketPrice =
    competitors.length > 0
      ? Math.round(
          competitors.reduce((s, c) => s + c.pricePerSqft, 0) /
            competitors.length
        )
      : 0;

  const cheapest = competitors.length
    ? competitors.reduce((m, c) => (c.pricePerSqft < m.pricePerSqft ? c : m))
    : null;

  const priceDiffVsMarket =
    avgMarketPrice > 0 && tenantAvgPrice > 0
      ? (((tenantAvgPrice - avgMarketPrice) / avgMarketPrice) * 100).toFixed(1)
      : null;

  // Chart data — add tenant as "You" column if we have avgPrice
  const chartData = [
    ...(tenantAvgPrice > 0
      ? [{ month: "You (Shubh)", value: tenantAvgPrice }]
      : []),
    ...competitors.map((c) => ({ month: c.project, value: c.pricePerSqft })),
  ];

  // All amenities across all competitors (for matrix header)
  const allAmenities = Array.from(
    new Set(competitors.flatMap((c) => c.amenities))
  ).slice(0, 8);

  return (
    <div>
      <PageHeader
        title="Competitor Tracker"
        subtitle="Monitor competitor projects, pricing, and amenities across Jaipur."
        icon="Swords"
        actions={
          <button onClick={() => setShowModal(true)} className="btn btn-primary gap-2">
            <Icon name="Plus" size={16} />
            Add Competitor
          </button>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <KPICard
          label="Competitors Tracked"
          value={String(competitors.length)}
          icon="Swords"
          accent="gold"
        />
        <KPICard
          label="Avg Market Price"
          value={avgMarketPrice > 0 ? `₹${avgMarketPrice}/sqft` : "—"}
          icon="TrendingUp"
          accent="blue"
        />
        <KPICard
          label="Your Avg Price"
          value={tenantAvgPrice > 0 ? `₹${tenantAvgPrice}/sqft` : "—"}
          icon="IndianRupee"
          accent="green"
        />
        <KPICard
          label="vs Market"
          value={
            priceDiffVsMarket !== null
              ? `${Number(priceDiffVsMarket) >= 0 ? "+" : ""}${priceDiffVsMarket}%`
              : "—"
          }
          icon="BarChart2"
          accent={
            priceDiffVsMarket !== null && Number(priceDiffVsMarket) > 5
              ? "red"
              : priceDiffVsMarket !== null && Number(priceDiffVsMarket) < -5
              ? "green"
              : "gold"
          }
        />
      </div>

      {competitors.length === 0 ? (
        <EmptyState
          icon="Swords"
          title="No Competitors Tracked Yet"
          hint="Add competitor projects to compare pricing, amenities, and possession timelines."
          action={
            <button onClick={() => setShowModal(true)} className="btn btn-primary gap-2">
              <Icon name="Plus" size={16} />
              Add Competitor
            </button>
          }
        />
      ) : (
        <div className="space-y-6">
          {/* Price Bar Chart */}
          <Card className="p-5">
            <div className="mb-4">
              <h3 className="font-display font-bold text-base">
                Price/sqft Comparison
              </h3>
              <p className="text-txt-dim text-sm">
                ₹ per sqft — your projects vs competitors
              </p>
            </div>
            <div className="h-[260px]">
              <PriceBarChart data={chartData} tenantAvgPrice={tenantAvgPrice} />
            </div>
          </Card>

          {/* Comparison Matrix */}
          <Card className="p-5">
            <h3 className="font-display font-bold text-base mb-4">
              Comparison Matrix
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line">
                    <th className="text-left py-2 px-3 text-txt-faint text-xs uppercase tracking-wide font-semibold">
                      Project
                    </th>
                    <th className="text-left py-2 px-3 text-txt-faint text-xs uppercase tracking-wide font-semibold">
                      Developer
                    </th>
                    <th className="text-left py-2 px-3 text-txt-faint text-xs uppercase tracking-wide font-semibold">
                      Location
                    </th>
                    <th className="text-right py-2 px-3 text-txt-faint text-xs uppercase tracking-wide font-semibold">
                      ₹/sqft
                    </th>
                    <th className="text-left py-2 px-3 text-txt-faint text-xs uppercase tracking-wide font-semibold">
                      Possession
                    </th>
                    {allAmenities.slice(0, 4).map((a) => (
                      <th
                        key={a}
                        className="text-center py-2 px-2 text-txt-faint text-xs font-semibold max-w-[80px] truncate"
                      >
                        {a}
                      </th>
                    ))}
                    <th className="py-2 px-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {/* Tenant "You" row */}
                  {tenantAvgPrice > 0 && (
                    <tr className="border-b border-line bg-gold-soft/20">
                      <td className="py-3 px-3 font-bold text-gold-bright">
                        Shubh Realtors (You)
                      </td>
                      <td className="py-3 px-3 text-txt-dim">—</td>
                      <td className="py-3 px-3 text-txt-dim">Multiple</td>
                      <td className="py-3 px-3 text-right font-bold text-gold-bright">
                        ₹{tenantAvgPrice.toLocaleString("en-IN")}
                      </td>
                      <td className="py-3 px-3 text-txt-dim">—</td>
                      {allAmenities.slice(0, 4).map((a) => (
                        <td key={a} className="py-3 px-2 text-center text-txt-faint">
                          —
                        </td>
                      ))}
                      <td className="py-3 px-2"></td>
                    </tr>
                  )}
                  {competitors.map((c) => {
                    const diff =
                      tenantAvgPrice > 0
                        ? c.pricePerSqft - tenantAvgPrice
                        : 0;
                    return (
                      <tr
                        key={c.id}
                        className="border-b border-line last:border-0 hover:bg-panel transition-colors"
                      >
                        <td className="py-3 px-3 font-semibold">{c.project}</td>
                        <td className="py-3 px-3 text-txt-dim">{c.name}</td>
                        <td className="py-3 px-3 text-txt-dim">{c.location || "—"}</td>
                        <td className="py-3 px-3 text-right">
                          <span className="font-bold">
                            ₹{c.pricePerSqft.toLocaleString("en-IN")}
                          </span>
                          {tenantAvgPrice > 0 && diff !== 0 && (
                            <span
                              className={`ml-1.5 text-xs ${
                                diff > 0 ? "text-red" : "text-green"
                              }`}
                            >
                              {diff > 0 ? "+" : ""}
                              {diff.toLocaleString("en-IN")}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-sm text-txt-dim">
                          {c.possession || "—"}
                        </td>
                        {allAmenities.slice(0, 4).map((a) => (
                          <td key={a} className="py-3 px-2 text-center">
                            {c.amenities.includes(a) ? (
                              <Icon
                                name="CheckCircle2"
                                size={15}
                                className="text-green inline"
                              />
                            ) : (
                              <Icon
                                name="MinusCircle"
                                size={15}
                                className="text-txt-faint inline"
                              />
                            )}
                          </td>
                        ))}
                        <td className="py-3 px-2">
                          <button
                            onClick={() => deleteCompetitor(c.id)}
                            disabled={deletingId === c.id}
                            className="btn btn-ghost p-1.5 text-txt-faint hover:text-red"
                            title="Remove competitor"
                          >
                            <Icon name="Trash2" size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Competitor cards */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {competitors.map((c) => (
              <Card key={c.id} className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm leading-tight truncate">
                      {c.project}
                    </p>
                    <p className="text-txt-dim text-xs mt-0.5">{c.name}</p>
                  </div>
                  <button
                    onClick={() => deleteCompetitor(c.id)}
                    disabled={deletingId === c.id}
                    className="btn btn-ghost p-1 text-txt-faint hover:text-red flex-shrink-0"
                  >
                    <Icon name="Trash2" size={13} />
                  </button>
                </div>
                <div className="space-y-1.5 text-sm">
                  <div className="flex items-center gap-2">
                    <Icon name="MapPin" size={13} className="text-txt-faint" />
                    <span className="text-txt-dim">{c.location || "—"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Icon name="IndianRupee" size={13} className="text-gold-bright" />
                    <span className="font-bold text-gold-bright">
                      ₹{c.pricePerSqft.toLocaleString("en-IN")}/sqft
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Icon name="CalendarClock" size={13} className="text-txt-faint" />
                    <span className="text-txt-dim">{c.possession || "—"}</span>
                  </div>
                </div>
                {c.amenities.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {c.amenities.slice(0, 4).map((a) => (
                      <span key={a} className="tag text-[10px]">
                        {a}
                      </span>
                    ))}
                    {c.amenities.length > 4 && (
                      <span className="tag text-[10px] text-txt-faint">
                        +{c.amenities.length - 4}
                      </span>
                    )}
                  </div>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}

      {showModal && (
        <AddCompetitorModal
          onClose={() => setShowModal(false)}
          onCreated={() => {
            setShowModal(false);
            refresh();
          }}
        />
      )}
    </div>
  );
}

// ─── Custom Price Bar Chart ───────────────────────────────────────
// Using recharts directly for ₹/sqft labeling (not Cr)

function PriceBarChart({
  data,
  tenantAvgPrice,
}: {
  data: { month: string; value: number }[];
  tenantAvgPrice: number;
}) {
  // Use CSS variables so colors adapt to light/dark theme
  const tooltipStyle: React.CSSProperties = {
    background: "var(--panel)",
    border: "1px solid var(--line)",
    borderRadius: 10,
    fontSize: 12,
    color: "var(--txt)",
  };

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart
        data={data}
        margin={{ top: 8, right: 8, left: -10, bottom: 0 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="var(--line)"
          vertical={false}
        />
        <XAxis
          dataKey="month"
          stroke="var(--txt-faint)"
          fontSize={11}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke="var(--txt-faint)"
          fontSize={11}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: number) => `₹${(v / 1000).toFixed(0)}K`}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          cursor={{ fill: "rgba(217,164,65,.06)" }}
          formatter={(v: number) => [
            `₹${v.toLocaleString("en-IN")}/sqft`,
            "Price",
          ]}
        />
        <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={52} animationDuration={900}>
          {data.map((entry, i) => (
            <Cell
              key={i}
              fill={
                i === 0 && tenantAvgPrice > 0
                  ? "#d9a441"
                  : `hsl(${210 + i * 30}, 60%, 55%)`
              }
              fillOpacity={i === 0 && tenantAvgPrice > 0 ? 1 : 0.85}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
