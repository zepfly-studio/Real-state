"use client";

import { useState, useCallback } from "react";
import { Card, PageHeader, Badge, EmptyState, ConnectBanner } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { inr } from "@/lib/format";

// ─── Types ────────────────────────────────────────────────────────────────────

interface LeadResult {
  id: string;
  name: string;
  title: string;
  company: string;
  email: string | null;
  emailMasked: string;
  phone: string | null;
  phoneMasked: string;
  location: string;
  industry: string;
  budget: number;
  companySize: string;
  score: number;
  enriched: boolean;
  demo: boolean;
}

interface Filters {
  industry: string;
  location: string;
  budgetMin: string;
  budgetMax: string;
  companySize: string;
}

const INDUSTRIES = [
  { value: "", label: "All Industries" },
  { value: "real-estate-buyers", label: "Real Estate Buyers" },
  { value: "nri-investors", label: "NRI Investors" },
  { value: "hni", label: "HNI (High Net-worth)" },
];

const LOCATIONS = [
  { value: "", label: "All Jaipur Areas" },
  { value: "Mansarovar", label: "Mansarovar" },
  { value: "Jagatpura", label: "Jagatpura" },
  { value: "Vaishali Nagar", label: "Vaishali Nagar" },
  { value: "Tonk Road", label: "Tonk Road" },
  { value: "Ajmer Road", label: "Ajmer Road" },
  { value: "C-Scheme", label: "C-Scheme" },
  { value: "Sitapura", label: "Sitapura" },
];

const COMPANY_SIZES = [
  { value: "", label: "Any Size" },
  { value: "1-10", label: "1–10 employees" },
  { value: "11-50", label: "11–50 employees" },
  { value: "51-200", label: "51–200 employees" },
  { value: "201+", label: "201+ employees" },
];

const BUDGET_RANGES = [
  { value: "", label: "Any Budget" },
  { value: "5000000-10000000", label: "₹50L – ₹1Cr" },
  { value: "10000000-20000000", label: "₹1Cr – ₹2Cr" },
  { value: "20000000-50000000", label: "₹2Cr – ₹5Cr" },
  { value: "50000000-", label: "₹5Cr+" },
];

function scoreBadge(score: number) {
  if (score >= 80) return <Badge tone="green">{score}</Badge>;
  if (score >= 60) return <Badge tone="gold">{score}</Badge>;
  return <Badge tone="neutral">{score}</Badge>;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function LeadGeniusClient({
  isDemo,
  tenantId,
}: {
  isDemo: boolean;
  tenantId: string;
}) {
  const [filters, setFilters] = useState<Filters>({
    industry: "",
    location: "",
    budgetMin: "",
    budgetMax: "",
    companySize: "",
  });

  const [results, setResults] = useState<LeadResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [enrichingIds, setEnrichingIds] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [addingCrm, setAddingCrm] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const handleSearch = useCallback(async () => {
    setLoading(true);
    setResults([]);
    setSelected(new Set());
    try {
      let budgetMin = "";
      let budgetMax = "";
      const budgetVal = filters.budgetMin || filters.budgetMax;
      if (budgetVal) {
        const parts = budgetVal.split("-");
        budgetMin = parts[0] || "";
        budgetMax = parts[1] || "";
      }

      const res = await fetch("/api/lead-genius/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          industry: filters.industry,
          location: filters.location,
          budgetMin,
          budgetMax,
          companySize: filters.companySize,
        }),
      });
      if (!res.ok) throw new Error("Search failed");
      const data = await res.json();
      setResults(data.leads || []);
    } catch {
      showToast("Search failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const handleEnrich = useCallback(async (leadId: string) => {
    setEnrichingIds((prev) => new Set(prev).add(leadId));
    try {
      const res = await fetch("/api/lead-genius/enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId }),
      });
      if (!res.ok) throw new Error("Enrich failed");
      const data = await res.json();
      setResults((prev) =>
        prev.map((l) => (l.id === leadId ? { ...l, ...data.lead, enriched: true } : l))
      );
    } catch {
      showToast("Enrichment failed.");
    } finally {
      setEnrichingIds((prev) => {
        const next = new Set(prev);
        next.delete(leadId);
        return next;
      });
    }
  }, []);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === results.length) setSelected(new Set());
    else setSelected(new Set(results.map((r) => r.id)));
  };

  const handleExportCsv = () => {
    const rows = results.filter((r) => selected.has(r.id));
    if (!rows.length) { showToast("Select at least one lead to export."); return; }
    const headers = ["Name", "Title", "Company", "Email", "Phone", "Location", "Industry", "Budget (INR)", "Score"];
    const csv = [
      headers.join(","),
      ...rows.map((r) =>
        [
          `"${r.name}"`,
          `"${r.title}"`,
          `"${r.company}"`,
          `"${r.enriched && r.email ? r.email : r.emailMasked}"`,
          `"${r.enriched && r.phone ? r.phone : r.phoneMasked}"`,
          `"${r.location}"`,
          `"${r.industry}"`,
          r.budget,
          r.score,
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads-export-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Exported ${rows.length} leads.`);
  };

  const handleAddToCrm = useCallback(async () => {
    const rows = results.filter((r) => selected.has(r.id));
    if (!rows.length) { showToast("Select at least one lead to add."); return; }
    setAddingCrm(true);
    try {
      const payload = rows.map((r) => ({
        name: r.name,
        phone: r.enriched && r.phone ? r.phone : "0000000000",
        email: r.enriched && r.email ? r.email : undefined,
        propertyType: "3BHK",
        location: r.location || "Jaipur",
        source: "COLD_CALL",
        temperature: r.score >= 80 ? "HOT" : r.score >= 60 ? "WARM" : "COLD",
        value: r.budget || 0,
        notes: `Imported from Lead Genius. Company: ${r.company}. Title: ${r.title}.`,
      }));

      const res = await fetch("/api/leads/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: payload }),
      });
      if (!res.ok) throw new Error("Import failed");
      const data = await res.json();
      showToast(`Added ${data.imported} lead${data.imported !== 1 ? "s" : ""} to CRM.`);
      setSelected(new Set());
    } catch {
      showToast("Failed to add leads to CRM.");
    } finally {
      setAddingCrm(false);
    }
  }, [results, selected]);

  const handleBudgetChange = (val: string) => {
    if (!val) {
      setFilters((f) => ({ ...f, budgetMin: "", budgetMax: "" }));
    } else {
      setFilters((f) => ({ ...f, budgetMin: val, budgetMax: val }));
    }
  };

  const budgetFilterValue = filters.budgetMin
    ? `${filters.budgetMin}-${filters.budgetMax}`
    : "";

  return (
    <div>
      <PageHeader
        title="Lead Genius"
        subtitle="Find & enrich real estate prospects in Jaipur"
        icon="Sparkles"
        actions={
          <div className="flex items-center gap-2">
            {selected.size > 0 && (
              <>
                <button
                  className="btn btn-ghost text-sm"
                  onClick={handleExportCsv}
                >
                  <Icon name="Download" size={15} />
                  Export CSV ({selected.size})
                </button>
                <button
                  className="btn btn-primary text-sm"
                  onClick={handleAddToCrm}
                  disabled={addingCrm}
                >
                  {addingCrm ? (
                    <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  ) : (
                    <Icon name="UserPlus" size={15} />
                  )}
                  Add to CRM
                </button>
              </>
            )}
          </div>
        }
      />

      {isDemo && (
        <ConnectBanner
          name="Apollo.io / Hunter.io / Clearbit"
          enables="Built-in prospect database with 25 Jaipur leads is fully functional. Real-time B2B contact discovery & enrichment unlocks when you connect."
        />
      )}

      {/* Filters */}
      <Card className="p-5 mb-5">
        <p className="section-label mb-4">Prospect Filters</p>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <div>
            <label className="field-label">Industry</label>
            <select
              className="input w-full"
              value={filters.industry}
              onChange={(e) => setFilters((f) => ({ ...f, industry: e.target.value }))}
            >
              {INDUSTRIES.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label">Area</label>
            <select
              className="input w-full"
              value={filters.location}
              onChange={(e) => setFilters((f) => ({ ...f, location: e.target.value }))}
            >
              {LOCATIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label">Budget Range</label>
            <select
              className="input w-full"
              value={budgetFilterValue}
              onChange={(e) => handleBudgetChange(e.target.value)}
            >
              {BUDGET_RANGES.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label">Company Size</label>
            <select
              className="input w-full"
              value={filters.companySize}
              onChange={(e) => setFilters((f) => ({ ...f, companySize: e.target.value }))}
            >
              {COMPANY_SIZES.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              className="btn btn-primary w-full"
              onClick={handleSearch}
              disabled={loading}
            >
              {loading ? (
                <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <Icon name="Search" size={15} />
              )}
              {loading ? "Searching…" : "Find Leads"}
            </button>
          </div>
        </div>
      </Card>

      {/* Results Table */}
      {results.length === 0 && !loading && (
        <EmptyState
          icon="UserSearch"
          title="No results yet"
          hint="Set your filters above and click Find Leads to discover prospects."
        />
      )}

      {loading && (
        <Card className="p-6">
          <div className="space-y-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-10 rounded-lg skeleton" />
            ))}
          </div>
        </Card>
      )}

      {results.length > 0 && !loading && (
        <Card className="overflow-hidden">
          {/* Table header actions */}
          <div className="flex items-center gap-3 p-4 border-b border-line">
            <input
              type="checkbox"
              checked={selected.size === results.length && results.length > 0}
              onChange={toggleAll}
              className="w-4 h-4 accent-[#d9a441] cursor-pointer"
            />
            <span className="text-sm text-txt-dim">
              {selected.size > 0
                ? `${selected.size} selected`
                : `${results.length} prospects found`}
            </span>
            {isDemo && (
              <span className="tag bg-gold-soft text-gold-bright ml-auto">Demo Data</span>
            )}
          </div>

          {/* Scrollable table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line">
                  <th className="w-10 px-4 py-3"></th>
                  <th className="text-left px-4 py-3 text-txt-faint font-semibold text-[11px] uppercase tracking-wide">Name</th>
                  <th className="text-left px-4 py-3 text-txt-faint font-semibold text-[11px] uppercase tracking-wide hidden md:table-cell">Title / Company</th>
                  <th className="text-left px-4 py-3 text-txt-faint font-semibold text-[11px] uppercase tracking-wide hidden lg:table-cell">Email</th>
                  <th className="text-left px-4 py-3 text-txt-faint font-semibold text-[11px] uppercase tracking-wide hidden lg:table-cell">Phone</th>
                  <th className="text-left px-4 py-3 text-txt-faint font-semibold text-[11px] uppercase tracking-wide hidden xl:table-cell">Area</th>
                  <th className="text-left px-4 py-3 text-txt-faint font-semibold text-[11px] uppercase tracking-wide hidden xl:table-cell">Budget</th>
                  <th className="text-center px-4 py-3 text-txt-faint font-semibold text-[11px] uppercase tracking-wide">Score</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {results.map((lead) => (
                  <tr
                    key={lead.id}
                    className={`border-b border-line transition-colors hover:bg-panel-2 ${
                      selected.has(lead.id) ? "bg-gold-soft/5" : ""
                    }`}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(lead.id)}
                        onChange={() => toggleSelect(lead.id)}
                        className="w-4 h-4 accent-[#d9a441] cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                          style={{
                            background: `hsl(${(lead.name.charCodeAt(0) * 37) % 360}, 55%, 35%)`,
                            color: "#f8f4e9",
                          }}
                        >
                          {lead.name.split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase()}
                        </div>
                        <span className="font-medium truncate max-w-[120px]">{lead.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="text-sm font-medium truncate max-w-[160px]">{lead.title}</div>
                      <div className="text-xs text-txt-dim truncate max-w-[160px]">{lead.company}</div>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      {lead.enriched && lead.email ? (
                        <span className="text-green">{lead.email}</span>
                      ) : (
                        <span className="text-txt-faint font-mono">{lead.emailMasked}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      {lead.enriched && lead.phone ? (
                        <span className="text-green">{lead.phone}</span>
                      ) : (
                        <span className="text-txt-faint font-mono">{lead.phoneMasked}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden xl:table-cell">
                      <span className="text-txt-dim">{lead.location}</span>
                    </td>
                    <td className="px-4 py-3 hidden xl:table-cell">
                      <span className="text-gold-bright font-semibold">{inr(lead.budget)}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {scoreBadge(lead.score)}
                    </td>
                    <td className="px-4 py-3">
                      {lead.enriched ? (
                        <Badge tone="green">
                          <Icon name="CheckCircle" size={12} />
                          Enriched
                        </Badge>
                      ) : (
                        <button
                          className="btn btn-ghost text-xs py-1 px-2"
                          onClick={() => handleEnrich(lead.id)}
                          disabled={enrichingIds.has(lead.id)}
                        >
                          {enrichingIds.has(lead.id) ? (
                            <span className="animate-spin inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full" />
                          ) : (
                            <Icon name="Zap" size={13} />
                          )}
                          Enrich
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          {selected.size > 0 && (
            <div className="flex items-center gap-3 p-4 border-t border-line bg-gold-soft/5">
              <Icon name="CheckSquare" size={16} className="text-gold-bright" />
              <span className="text-sm font-medium">{selected.size} selected</span>
              <button className="btn btn-ghost text-sm ml-auto" onClick={handleExportCsv}>
                <Icon name="Download" size={14} /> Export CSV
              </button>
              <button
                className="btn btn-primary text-sm"
                onClick={handleAddToCrm}
                disabled={addingCrm}
              >
                {addingCrm ? (
                  <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                ) : (
                  <Icon name="UserPlus" size={14} />
                )}
                Add to CRM
              </button>
            </div>
          )}
        </Card>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 card p-4 text-sm font-medium shadow-2xl border border-line animate-fade-in">
          {toast}
        </div>
      )}
    </div>
  );
}
