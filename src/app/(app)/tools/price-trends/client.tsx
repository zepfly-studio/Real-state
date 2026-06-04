"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card, PageHeader, EmptyState } from "@/components/ui";
import { TrendLine } from "@/components/charts";
import { Icon } from "@/components/Icon";
import { pct } from "@/lib/format";
import { Loader2, RefreshCw, Plus, X } from "lucide-react";

interface ChangeRow {
  area: string;
  current: number;
  sixMonthAgo: number;
  oneYearAgo: number | null;
}

interface PriceTrendsClientProps {
  chartData: Record<string, string | number>[];
  changeTable: ChangeRow[];
  availableAreas: string[];
  allAreas: string[];
  canEdit: boolean;
  marketConnected: boolean;
}

// Colors for each Jaipur area
const AREA_COLORS: Record<string, string> = {
  Mansarovar: "#d9a441",
  Jagatpura: "#5b8def",
  "Vaishali Nagar": "#3ec78d",
  "Tonk Road": "#9b7ef0",
  "Ajmer Road": "#f0556a",
  "C-Scheme": "#f0c14b",
  Sitapura: "#60c8e8",
};

function formatMonth(monthStr: string): string {
  const [year, month] = monthStr.split("-");
  const d = new Date(Number(year), Number(month) - 1, 1);
  return d.toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
}

export function PriceTrendsClient({
  chartData,
  changeTable,
  availableAreas,
  allAreas,
  canEdit,
  marketConnected,
}: PriceTrendsClientProps) {
  const router = useRouter();
  const [activeAreas, setActiveAreas] = useState<Set<string>>(
    new Set(availableAreas)
  );
  const [busy, setBusy] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ area: allAreas[0] ?? "", month: "2026-06", pricePerSqft: "" });
  const [msg, setMsg] = useState("");

  async function recompute() {
    setBusy(true);
    setMsg("");
    const res = await fetch("/api/price-trends", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "recompute" }),
    });
    setBusy(false);
    if (res.ok) {
      const j = await res.json();
      setMsg(`Recomputed ${j.count} data points from your inventory.`);
      router.refresh();
    } else setMsg("Recompute failed.");
  }

  async function addPoint() {
    if (!form.area || !form.month || !form.pricePerSqft) return;
    setBusy(true);
    const res = await fetch("/api/price-trends", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setBusy(false);
    if (res.ok) {
      setShowAdd(false);
      setForm({ area: allAreas[0] ?? "", month: "2026-06", pricePerSqft: "" });
      router.refresh();
    } else {
      const j = await res.json().catch(() => ({}));
      setMsg(j.error || "Failed to add point.");
    }
  }

  function toggleArea(area: string) {
    setActiveAreas((prev) => {
      const next = new Set(prev);
      if (next.has(area)) {
        // Don't allow deselecting all
        if (next.size > 1) next.delete(area);
      } else {
        next.add(area);
      }
      return next;
    });
  }

  // Prepare chart data with formatted months
  const formattedChartData = useMemo(
    () =>
      chartData.map((row) => ({
        ...row,
        month:
          typeof row.month === "string" ? formatMonth(row.month) : row.month,
      })),
    [chartData]
  );

  // Keys for the TrendLine
  const trendKeys = useMemo(
    () =>
      availableAreas
        .filter((a) => activeAreas.has(a))
        .map((a) => ({ key: a, color: AREA_COLORS[a] ?? "#d9a441" })),
    [availableAreas, activeAreas]
  );

  // Summary stats
  const latestPrices = changeTable.map((r) => r.current);
  const cityAvg =
    latestPrices.length > 0
      ? Math.round(latestPrices.reduce((s, v) => s + v, 0) / latestPrices.length)
      : 0;

  const topGainer = changeTable.reduce<ChangeRow | null>((best, row) => {
    const chg = ((row.current - row.sixMonthAgo) / row.sixMonthAgo) * 100;
    if (!best) return row;
    const bestChg = ((best.current - best.sixMonthAgo) / best.sixMonthAgo) * 100;
    return chg > bestChg ? row : best;
  }, null);

  const mostExpensive = changeTable.reduce<ChangeRow | null>((best, row) => {
    if (!best || row.current > best.current) return row;
    return best;
  }, null);

  const mostAffordable = changeTable.reduce<ChangeRow | null>((best, row) => {
    if (!best || row.current < best.current) return row;
    return best;
  }, null);

  if (availableAreas.length === 0) {
    return (
      <div>
        <PageHeader
          title="Property Price Trends"
          subtitle="Area-wise ₹/sqft, derived from your real inventory."
          icon="TrendingUp"
        />
        <EmptyState
          icon="TrendingUp"
          title="No price trend data yet"
          hint={canEdit ? "Recompute from your inventory, or add a data point manually." : "Ask an admin to populate price trends."}
          action={
            canEdit ? (
              <button className="btn btn-primary" onClick={recompute} disabled={busy}>
                {busy ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={15} />} Recompute from inventory
              </button>
            ) : undefined
          }
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Property Price Trends"
        subtitle="Area-wise ₹/sqft — derived from your real inventory listings."
        icon="TrendingUp"
        actions={
          canEdit ? (
            <>
              <button className="btn" onClick={recompute} disabled={busy} title="Rebuild from your Property inventory">
                {busy ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />} Recompute
              </button>
              <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
                <Plus size={15} /> Add data point
              </button>
            </>
          ) : undefined
        }
      />

      {/* Data source note + optional live-market banner */}
      <div className="card p-3 mb-5 flex flex-wrap items-center gap-2 text-sm">
        <Icon name="Database" size={15} className="text-gold-bright" />
        <span className="text-txt-dim">
          Trends are computed from your inventory's average ₹/sqft per area, per listing month.
          {marketConnected
            ? " Live market index is connected."
            : " Add monthly data points manually, or "}
        </span>
        {!marketConnected && (
          <a href="/settings" className="text-gold-bright font-semibold">connect a Market Data provider</a>
        )}
        {!marketConnected && <span className="text-txt-dim">for a live area-level index.</span>}
        {msg && <span className="text-green ml-auto">{msg}</span>}
      </div>

      {/* Add / edit data point modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <Card className="w-full max-w-sm p-6 animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-bold text-lg">Add price data point</h3>
              <button onClick={() => setShowAdd(false)} className="text-txt-faint hover:text-txt"><X size={20} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="field-label">Area</label>
                <select className="input" value={form.area} onChange={(e) => setForm((f) => ({ ...f, area: e.target.value }))}>
                  {allAreas.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              <div>
                <label className="field-label">Month</label>
                <input className="input" type="month" value={form.month} onChange={(e) => setForm((f) => ({ ...f, month: e.target.value }))} />
              </div>
              <div>
                <label className="field-label">Price ₹ / sqft</label>
                <input className="input" type="number" value={form.pricePerSqft} onChange={(e) => setForm((f) => ({ ...f, pricePerSqft: e.target.value }))} placeholder="e.g. 6200" />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button className="btn btn-ghost flex-1 justify-center" onClick={() => setShowAdd(false)}>Cancel</button>
              <button className="btn btn-primary flex-1 justify-center" onClick={addPoint} disabled={busy || !form.pricePerSqft}>
                {busy ? <Loader2 size={15} className="animate-spin" /> : "Save point"}
              </button>
            </div>
          </Card>
        </div>
      )}

      {/* Summary KPI tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="card p-4">
          <p className="text-[11px] uppercase tracking-wide text-txt-faint font-semibold mb-1">
            City Average
          </p>
          <p className="font-display text-xl font-bold text-gold-bright">
            ₹{cityAvg.toLocaleString("en-IN")}
            <span className="text-txt-faint text-xs font-normal ml-1">/sqft</span>
          </p>
        </div>
        <div className="card p-4">
          <p className="text-[11px] uppercase tracking-wide text-txt-faint font-semibold mb-1">
            Top Gainer (6mo)
          </p>
          {topGainer && (
            <>
              <p className="font-display text-lg font-bold text-green truncate">
                {topGainer.area}
              </p>
              <p className="text-xs text-green font-semibold">
                {pct(
                  ((topGainer.current - topGainer.sixMonthAgo) /
                    topGainer.sixMonthAgo) *
                    100
                )}
              </p>
            </>
          )}
        </div>
        <div className="card p-4">
          <p className="text-[11px] uppercase tracking-wide text-txt-faint font-semibold mb-1">
            Most Expensive
          </p>
          {mostExpensive && (
            <>
              <p className="font-display text-lg font-bold truncate">
                {mostExpensive.area}
              </p>
              <p className="text-xs text-txt-dim">
                ₹{mostExpensive.current.toLocaleString("en-IN")}/sqft
              </p>
            </>
          )}
        </div>
        <div className="card p-4">
          <p className="text-[11px] uppercase tracking-wide text-txt-faint font-semibold mb-1">
            Most Affordable
          </p>
          {mostAffordable && (
            <>
              <p className="font-display text-lg font-bold truncate">
                {mostAffordable.area}
              </p>
              <p className="text-xs text-txt-dim">
                ₹{mostAffordable.current.toLocaleString("en-IN")}/sqft
              </p>
            </>
          )}
        </div>
      </div>

      {/* Area filter chips */}
      <div className="flex flex-wrap gap-2 mb-5">
        <span className="text-txt-faint text-xs font-semibold self-center mr-1">
          Areas:
        </span>
        {availableAreas.map((area) => (
          <button
            key={area}
            onClick={() => toggleArea(area)}
            className={`tag transition-all ${
              activeAreas.has(area)
                ? "text-[#1a1205] font-semibold"
                : "bg-panel-2 text-txt-faint hover:text-txt"
            }`}
            style={
              activeAreas.has(area)
                ? { background: AREA_COLORS[area] ?? "#d9a441" }
                : undefined
            }
          >
            {area}
          </button>
        ))}
      </div>

      {/* Line chart */}
      <Card className="p-5 mb-6">
        <div className="mb-4">
          <h3 className="font-display font-bold text-base">
            Price/sqft Trends by Area
          </h3>
          <p className="text-txt-dim text-sm">
            Monthly ₹ per sqft — toggle areas using the chips above
          </p>
        </div>
        <TrendLine data={formattedChartData} keys={trendKeys} />
      </Card>

      {/* 6-month & 1-year change table */}
      <Card className="p-5">
        <h3 className="font-display font-bold text-base mb-4">
          Price Change Analysis
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line">
                <th className="text-left py-2 px-3 text-txt-faint font-semibold text-xs uppercase tracking-wide">
                  Area
                </th>
                <th className="text-right py-2 px-3 text-txt-faint font-semibold text-xs uppercase tracking-wide">
                  Current (Jun 26)
                </th>
                <th className="text-right py-2 px-3 text-txt-faint font-semibold text-xs uppercase tracking-wide">
                  6mo Ago
                </th>
                <th className="text-right py-2 px-3 text-txt-faint font-semibold text-xs uppercase tracking-wide">
                  6mo Change
                </th>
                <th className="text-right py-2 px-3 text-txt-faint font-semibold text-xs uppercase tracking-wide">
                  1yr Ago
                </th>
                <th className="text-right py-2 px-3 text-txt-faint font-semibold text-xs uppercase tracking-wide">
                  1yr Change
                </th>
              </tr>
            </thead>
            <tbody>
              {changeTable.map((row) => {
                const sixMoChg =
                  row.sixMonthAgo > 0
                    ? ((row.current - row.sixMonthAgo) / row.sixMonthAgo) * 100
                    : 0;
                const oneYrChg =
                  row.oneYearAgo && row.oneYearAgo > 0
                    ? ((row.current - row.oneYearAgo) / row.oneYearAgo) * 100
                    : null;

                const isActiveArea = activeAreas.has(row.area);

                return (
                  <tr
                    key={row.area}
                    className={`border-b border-line last:border-0 transition-colors ${
                      isActiveArea ? "hover:bg-panel" : "opacity-50"
                    }`}
                  >
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{
                            background: AREA_COLORS[row.area] ?? "#d9a441",
                          }}
                        />
                        <span className="font-semibold">{row.area}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-gold-bright">
                      ₹{row.current.toLocaleString("en-IN")}
                    </td>
                    <td className="py-3 px-3 text-right text-txt-dim">
                      ₹{row.sixMonthAgo.toLocaleString("en-IN")}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Icon
                          name={sixMoChg >= 0 ? "TrendingUp" : "TrendingDown"}
                          size={13}
                          className={sixMoChg >= 0 ? "text-green" : "text-red"}
                        />
                        <span
                          className={`font-semibold ${
                            sixMoChg >= 0 ? "text-green" : "text-red"
                          }`}
                        >
                          {pct(sixMoChg)}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right text-txt-dim">
                      {row.oneYearAgo
                        ? `₹${row.oneYearAgo.toLocaleString("en-IN")}`
                        : "—"}
                    </td>
                    <td className="py-3 px-3 text-right">
                      {oneYrChg !== null ? (
                        <div className="flex items-center justify-end gap-1">
                          <Icon
                            name={oneYrChg >= 0 ? "TrendingUp" : "TrendingDown"}
                            size={13}
                            className={oneYrChg >= 0 ? "text-green" : "text-red"}
                          />
                          <span
                            className={`font-semibold ${
                              oneYrChg >= 0 ? "text-green" : "text-red"
                            }`}
                          >
                            {pct(oneYrChg)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-txt-faint text-xs">
                          Insufficient data
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
