"use client";

import React, { useState, useCallback, useMemo } from "react";
import { Card, PageHeader, Badge, ConnectBanner, EmptyState } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { AreaTrend } from "@/components/charts";

// ─── Types ────────────────────────────────────────────────────────────────────

interface KeywordRow {
  keyword: string;
  volume: number;
  difficulty: number; // 0–100
  cpc: number; // INR
  intent: "Informational" | "Commercial" | "Transactional" | "Navigational";
}

interface AuditIssue {
  severity: "critical" | "warning" | "info";
  title: string;
  description: string;
}

interface AuditScore {
  performance: number;
  seo: number;
  accessibility: number;
  bestPractices: number;
}

interface TrackedKeyword {
  keyword: string;
  rank: number;
  prev: number;
  url: string;
  trend: { label: string; value: number }[];
}

// ─── Mock data generators ─────────────────────────────────────────────────────

const JAIPUR_KEYWORD_POOL: KeywordRow[] = [
  { keyword: "3bhk in jagatpura", volume: 4400, difficulty: 28, cpc: 42, intent: "Transactional" },
  { keyword: "flats in jaipur", volume: 18100, difficulty: 52, cpc: 78, intent: "Commercial" },
  { keyword: "2bhk apartment mansarovar jaipur", volume: 3200, difficulty: 31, cpc: 56, intent: "Transactional" },
  { keyword: "plots for sale vaishali nagar jaipur", volume: 2700, difficulty: 35, cpc: 62, intent: "Transactional" },
  { keyword: "property in tonk road jaipur", volume: 5600, difficulty: 44, cpc: 71, intent: "Commercial" },
  { keyword: "jaipur real estate investment", volume: 8100, difficulty: 61, cpc: 95, intent: "Informational" },
  { keyword: "luxury villas jaipur", volume: 1900, difficulty: 39, cpc: 110, intent: "Commercial" },
  { keyword: "ready to move flats c-scheme jaipur", volume: 1400, difficulty: 22, cpc: 48, intent: "Transactional" },
  { keyword: "commercial property sitapura jaipur", volume: 2100, difficulty: 33, cpc: 85, intent: "Commercial" },
  { keyword: "affordable housing scheme jaipur", volume: 6200, difficulty: 48, cpc: 35, intent: "Informational" },
  { keyword: "ajmer road jaipur property price", volume: 3800, difficulty: 29, cpc: 52, intent: "Informational" },
  { keyword: "rera registered projects jaipur", volume: 4900, difficulty: 40, cpc: 67, intent: "Informational" },
  { keyword: "buy flat under 50 lakh jaipur", volume: 7300, difficulty: 55, cpc: 88, intent: "Transactional" },
  { keyword: "new residential projects jaipur 2024", volume: 2900, difficulty: 36, cpc: 74, intent: "Commercial" },
  { keyword: "home loan jaipur property", volume: 11200, difficulty: 63, cpc: 120, intent: "Commercial" },
];

function generateKeywords(seed: string): KeywordRow[] {
  const seedLower = seed.toLowerCase();
  const relevant = JAIPUR_KEYWORD_POOL.filter(
    (k) =>
      k.keyword.includes(seedLower) ||
      seedLower.includes(k.keyword.split(" ")[0]) ||
      (seedLower.includes("jagatpura") && k.keyword.includes("jagatpura")) ||
      (seedLower.includes("3bhk") && k.keyword.includes("3bhk")) ||
      (seedLower.includes("flat") && k.keyword.includes("flat")) ||
      (seedLower.includes("jaipur") && k.keyword.includes("jaipur"))
  );
  const others = JAIPUR_KEYWORD_POOL.filter((k) => !relevant.includes(k)).slice(0, 8 - relevant.length);
  return [...relevant, ...others].slice(0, 12);
}

const MOCK_ISSUES: AuditIssue[] = [
  { severity: "critical", title: "Missing meta description on 3 pages", description: "Pages /properties, /contact, /about are missing meta descriptions — crucial for CTR in search results." },
  { severity: "critical", title: "Images not compressed", description: "32 images weigh over 500KB each. Use WebP format and compression to speed up load time by ~60%." },
  { severity: "critical", title: "No canonical tags on listing pages", description: "Duplicate content risk: property listing pages lack canonical URLs, causing ranking split." },
  { severity: "warning", title: "H1 tag used multiple times on home page", description: "Only one H1 should appear per page. Found 3 H1 tags on the home page." },
  { severity: "warning", title: "Slow mobile load time (6.2s)", description: "Google Page Experience uses mobile speed as a ranking signal. Target under 3 seconds." },
  { severity: "warning", title: "Missing alt text on 18 images", description: "Screen readers and search crawlers use alt text to understand images. Add descriptive alt tags." },
  { severity: "warning", title: "No structured data (Schema.org)", description: "Add RealEstateListing schema to property pages to unlock rich snippets in search results." },
  { severity: "info", title: "Sitemap found and valid", description: "sitemap.xml is accessible and lists 47 URLs. Submit it to Google Search Console." },
  { severity: "info", title: "HTTPS enabled", description: "All pages are served over HTTPS — a positive ranking signal." },
  { severity: "info", title: "robots.txt found", description: "robots.txt is properly configured and accessible." },
];

const MOCK_TRACKED: TrackedKeyword[] = [
  {
    keyword: "3bhk flats jagatpura jaipur",
    rank: 4, prev: 7,
    url: "/listings/jagatpura-3bhk",
    trend: [
      { label: "Jan", value: 12 }, { label: "Feb", value: 10 }, { label: "Mar", value: 8 },
      { label: "Apr", value: 7 }, { label: "May", value: 5 }, { label: "Jun", value: 4 },
    ],
  },
  {
    keyword: "luxury villas jaipur",
    rank: 11, prev: 9,
    url: "/listings/luxury-villas",
    trend: [
      { label: "Jan", value: 8 }, { label: "Feb", value: 9 }, { label: "Mar", value: 10 },
      { label: "Apr", value: 9 }, { label: "May", value: 10 }, { label: "Jun", value: 11 },
    ],
  },
  {
    keyword: "shubh realtors jaipur",
    rank: 1, prev: 1,
    url: "/",
    trend: [
      { label: "Jan", value: 1 }, { label: "Feb", value: 1 }, { label: "Mar", value: 1 },
      { label: "Apr", value: 1 }, { label: "May", value: 1 }, { label: "Jun", value: 1 },
    ],
  },
  {
    keyword: "property tonk road jaipur",
    rank: 6, prev: 8,
    url: "/listings/tonk-road",
    trend: [
      { label: "Jan", value: 14 }, { label: "Feb", value: 12 }, { label: "Mar", value: 10 },
      { label: "Apr", value: 9 }, { label: "May", value: 7 }, { label: "Jun", value: 6 },
    ],
  },
  {
    keyword: "buy flat under 50 lakh jaipur",
    rank: 18, prev: 22,
    url: "/listings/affordable",
    trend: [
      { label: "Jan", value: 28 }, { label: "Feb", value: 25 }, { label: "Mar", value: 23 },
      { label: "Apr", value: 22 }, { label: "May", value: 20 }, { label: "Jun", value: 18 },
    ],
  },
  {
    keyword: "rera approved projects jaipur",
    rank: 9, prev: 14,
    url: "/rera-projects",
    trend: [
      { label: "Jan", value: 18 }, { label: "Feb", value: 16 }, { label: "Mar", value: 14 },
      { label: "Apr", value: 13 }, { label: "May", value: 11 }, { label: "Jun", value: 9 },
    ],
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function DifficultyBar({ value }: { value: number }) {
  const color = value < 35 ? "#3ec78d" : value < 60 ? "#d9a441" : "#f0556a";
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-2 rounded-full bg-bg-2 overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${value}%`, background: color }} />
      </div>
      <span className="text-xs font-semibold" style={{ color }}>{value}</span>
    </div>
  );
}

function ScoreGauge({ label, value, color }: { label: string; value: number; color: string }) {
  const r = 30;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="80" height="80" viewBox="0 0 80 80">
        <circle cx="40" cy="40" r={r} fill="none" stroke="var(--line)" strokeWidth="8" />
        <circle
          cx="40" cy="40" r={r}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 40 40)"
          style={{ transition: "stroke-dashoffset 0.8s ease" }}
        />
        <text x="40" y="46" textAnchor="middle" fontSize="16" fontWeight="bold" fill="var(--txt)">{value}</text>
      </svg>
      <span className="text-[11px] text-txt-dim font-semibold">{label}</span>
    </div>
  );
}

const INTENT_TONE: Record<string, "green" | "blue" | "gold" | "purple"> = {
  Transactional: "green",
  Commercial: "gold",
  Informational: "blue",
  Navigational: "purple",
};

// ─── Tab: Keyword Research ────────────────────────────────────────────────────

function KeywordResearch() {
  const [seed, setSeed] = useState("3bhk in jagatpura");
  const [rows, setRows] = useState<KeywordRow[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = useCallback(() => {
    if (!seed.trim()) return;
    setLoading(true);
    // Simulate brief async delay
    setTimeout(() => {
      setRows(generateKeywords(seed.trim()));
      setLoading(false);
    }, 700);
  }, [seed]);

  const totalVolume = useMemo(() => rows.reduce((s, r) => s + r.volume, 0), [rows]);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          className="input flex-1"
          placeholder="Enter seed keyword e.g. 3bhk in jagatpura"
          value={seed}
          onChange={(e) => setSeed(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
        />
        <button className="btn btn-primary px-6" onClick={handleSearch} disabled={loading}>
          {loading ? (
            <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
          ) : (
            <Icon name="Search" size={15} />
          )}
          {loading ? "Researching…" : "Research"}
        </button>
      </div>

      {rows.length > 0 && (
        <>
          <div className="card p-3 text-xs text-txt-dim flex items-center gap-2 border-dashed">
            <Icon name="Info" size={14} className="text-gold-bright" />
            <span><strong className="text-txt">Sample metrics</strong> for demonstration. Connect Google Search Console / SEMrush / Ahrefs for live search volumes, difficulty & CPC.</span>
          </div>
          <div className="flex items-center gap-4 text-sm text-txt-dim">
            <span className="font-semibold text-txt">{rows.length} keyword ideas</span>
            <span>Est. combined volume: <strong className="text-gold-bright">{totalVolume.toLocaleString("en-IN")}/mo</strong></span>
          </div>
          <Card className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left">
                  <th className="p-3 text-txt-dim font-semibold text-xs uppercase tracking-wide">Keyword</th>
                  <th className="p-3 text-txt-dim font-semibold text-xs uppercase tracking-wide text-right">Volume/mo</th>
                  <th className="p-3 text-txt-dim font-semibold text-xs uppercase tracking-wide">Difficulty</th>
                  <th className="p-3 text-txt-dim font-semibold text-xs uppercase tracking-wide text-right">CPC (₹)</th>
                  <th className="p-3 text-txt-dim font-semibold text-xs uppercase tracking-wide">Intent</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-b border-line last:border-0 hover:bg-panel-2 transition-colors">
                    <td className="p-3 font-medium">{r.keyword}</td>
                    <td className="p-3 text-right font-semibold text-gold-bright">{r.volume.toLocaleString("en-IN")}</td>
                    <td className="p-3"><DifficultyBar value={r.difficulty} /></td>
                    <td className="p-3 text-right text-txt-dim">₹{r.cpc}</td>
                    <td className="p-3">
                      <Badge tone={INTENT_TONE[r.intent] ?? "neutral"}>{r.intent}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}

      {rows.length === 0 && !loading && (
        <EmptyState
          icon="SearchCheck"
          title="Enter a seed keyword to get started"
          hint="Try 'flats in jaipur', '3bhk jagatpura', or 'luxury villas jaipur' for Jaipur-specific keyword ideas with volume, difficulty, and CPC data."
        />
      )}
    </div>
  );
}

// ─── Tab: Site Audit ──────────────────────────────────────────────────────────

function SiteAudit() {
  const [url, setUrl] = useState("");
  const [scores, setScores] = useState<AuditScore | null>(null);
  const [issues, setIssues] = useState<AuditIssue[]>([]);
  const [loading, setLoading] = useState(false);
  const [audited, setAudited] = useState("");

  const handleAudit = useCallback(() => {
    const trimmed = url.trim();
    if (!trimmed) return;
    setLoading(true);
    setTimeout(() => {
      // Generate believable mock scores based on url length (deterministic but varied)
      const seed = trimmed.length;
      setScores({
        performance: 55 + (seed % 20),
        seo: 62 + (seed % 18),
        accessibility: 74 + (seed % 12),
        bestPractices: 80 + (seed % 10),
      });
      setIssues(MOCK_ISSUES);
      setAudited(trimmed);
      setLoading(false);
    }, 1200);
  }, [url]);

  const severityOrder = { critical: 0, warning: 1, info: 2 };
  const sorted = useMemo(
    () => [...issues].sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]),
    [issues]
  );

  const criticalCount = issues.filter((i) => i.severity === "critical").length;
  const warningCount = issues.filter((i) => i.severity === "warning").length;

  const severityIcon: Record<string, string> = {
    critical: "AlertCircle",
    warning: "AlertTriangle",
    info: "Info",
  };
  const severityColor: Record<string, string> = {
    critical: "text-red",
    warning: "text-gold-bright",
    info: "text-blue",
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          className="input flex-1"
          placeholder="Enter your website URL e.g. https://shubhrealtors.com"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAudit()}
        />
        <button className="btn btn-primary px-6" onClick={handleAudit} disabled={loading}>
          {loading ? (
            <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
          ) : (
            <Icon name="ScanSearch" size={15} />
          )}
          {loading ? "Auditing…" : "Run Audit"}
        </button>
      </div>

      {scores && (
        <>
          <div className="card p-3 text-xs text-txt-dim flex items-center gap-2 border-dashed">
            <Icon name="Info" size={14} className="text-gold-bright" />
            <span><strong className="text-txt">Sample audit</strong> for demonstration. Connect Google PageSpeed / Search Console for a live crawl of your real site.</span>
          </div>
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div>
                <h3 className="font-display font-bold">Audit Results</h3>
                <p className="text-txt-dim text-sm">{audited}</p>
              </div>
              <div className="flex items-center gap-3">
                {criticalCount > 0 && (
                  <span className="tag bg-[rgba(240,85,106,.14)] text-red">{criticalCount} critical</span>
                )}
                {warningCount > 0 && (
                  <span className="tag bg-gold-soft text-gold-bright">{warningCount} warnings</span>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 justify-items-center">
              <ScoreGauge label="Performance" value={scores.performance} color="#f0556a" />
              <ScoreGauge label="SEO" value={scores.seo} color="#3ec78d" />
              <ScoreGauge label="Accessibility" value={scores.accessibility} color="#5b8def" />
              <ScoreGauge label="Best Practices" value={scores.bestPractices} color="#9b7ef0" />
            </div>
          </Card>

          <Card className="overflow-hidden">
            <div className="p-4 border-b border-line">
              <h3 className="font-display font-bold text-base">Issues Checklist</h3>
            </div>
            <div className="divide-y divide-line">
              {sorted.map((issue, i) => (
                <div key={i} className="flex items-start gap-3 p-4 hover:bg-panel-2 transition-colors">
                  <Icon
                    name={severityIcon[issue.severity]}
                    size={16}
                    className={`mt-0.5 flex-shrink-0 ${severityColor[issue.severity]}`}
                  />
                  <div>
                    <div className="font-semibold text-sm">{issue.title}</div>
                    <div className="text-txt-dim text-xs mt-0.5">{issue.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}

      {!scores && !loading && (
        <EmptyState
          icon="ScanSearch"
          title="Enter a URL to audit"
          hint="Get a scored audit report covering performance, SEO, accessibility, and best practices — with a prioritised checklist of issues to fix."
        />
      )}
    </div>
  );
}

// ─── Tab: AI Blog Writer ──────────────────────────────────────────────────────

const MOCK_BLOG_TEMPLATE = (topic: string, keywords: string) => `# ${topic}

## Introduction

Looking to invest in Jaipur's booming real estate market? Whether you're a first-time buyer or seasoned investor, understanding the local property landscape can make all the difference. In this guide, we break down everything you need to know about ${topic.toLowerCase()}.

## Why Jaipur Real Estate Is Booming in 2024

Jaipur, the Pink City of Rajasthan, has emerged as one of North India's fastest-growing real estate destinations. With rapid infrastructure development, the Delhi-Mumbai Industrial Corridor (DMIC), and an expanding IT sector, demand for both residential and commercial properties is at an all-time high.

Key growth drivers include:
- **Metro Phase 2 expansion** connecting Mansarovar to Jagatpura and beyond
- **Smart City Mission** investments transforming Vaishali Nagar and C-Scheme
- **IT/ITES corridor** in Sitapura driving demand for quality housing near offices
- **Affordable housing schemes** making homeownership accessible to more families

## Top Localities to Consider

**Jagatpura** has emerged as a prime micro-market for 2 and 3 BHK apartments. With the upcoming metro connectivity and close proximity to Jaipur International Airport, prices here have appreciated 18% in the past 24 months.

**Vaishali Nagar** remains the perennial favourite for end-users seeking a developed neighbourhood with excellent schools, hospitals, and shopping facilities. Prices range from ₹55–85 lakh for a 2 BHK.

**Tonk Road** is witnessing strong commercial and residential development, particularly near the RIICO area. Investors are picking up plots and commercial spaces in anticipation of further price appreciation.

## What to Look for When Buying

1. **RERA Registration** — Always verify the project on Rajasthan RERA's website. This ensures your builder is compliant and your investment is protected.
2. **Possession Timeline** — Check the promised delivery date against the builder's track record.
3. **Amenities vs. Price** — Evaluate whether the quoted price reflects the amenities offered (club house, parking, power backup, etc.).
4. **Loan Eligibility** — Most banks offer up to 80% of property value as a home loan. Check EMI affordability before committing.

## Pricing Overview (June 2024)

| Locality | Type | Price Range |
|---|---|---|
| Jagatpura | 3 BHK | ₹65–90L |
| Mansarovar | 2 BHK | ₹55–75L |
| Vaishali Nagar | 2 BHK | ₹60–85L |
| Tonk Road | Plot | ₹3,500–5,500/sqft |
| C-Scheme | Commercial | ₹8,000–14,000/sqft |

## Final Thoughts

The Jaipur real estate market offers excellent opportunities for both end-users and investors. By focusing on RERA-registered projects in growth corridors and partnering with a trusted developer, you can secure strong returns while minimising risk.

**Ready to explore properties?** Our team at Shubh Realtors specialises in premium residential and commercial projects across Jaipur. [Contact us today](#) for a personalised site visit and consultation.

---
*Keywords covered: ${keywords || topic}*`;

function AiBlogWriter({ hasBlogWriter }: { hasBlogWriter: boolean }) {
  const [topic, setTopic] = useState("");
  const [keywords, setKeywords] = useState("");
  const [result, setResult] = useState<{ title: string; markdown: string; mode: "builtin" | "ai" } | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = useCallback(async () => {
    const t = topic.trim();
    if (!t) { setError("Please enter a topic."); return; }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/seo/blog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: t, keywords: keywords.trim() }),
      });
      if (!res.ok) throw new Error("API error");
      const data = await res.json();
      setResult({ ...data, mode: data.mode ?? "builtin" });
    } catch {
      // Never throw to user — show built-in template instead
      setResult({
        title: t,
        markdown: MOCK_BLOG_TEMPLATE(t, keywords),
        mode: "builtin",
      });
    } finally {
      setLoading(false);
    }
  }, [topic, keywords]);

  const handleCopy = useCallback(() => {
    if (!result) return;
    navigator.clipboard.writeText(result.markdown).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [result]);

  // Render markdown-ish preview (basic)
  const renderPreview = (md: string) => {
    return md.split("\n").map((line, i) => {
      if (line.startsWith("# ")) return <h1 key={i} className="font-display text-2xl font-bold mt-4 mb-2">{line.slice(2)}</h1>;
      if (line.startsWith("## ")) return <h2 key={i} className="font-display text-lg font-bold mt-5 mb-2 text-gold-bright">{line.slice(3)}</h2>;
      if (line.startsWith("### ")) return <h3 key={i} className="font-display text-base font-bold mt-4 mb-1">{line.slice(4)}</h3>;
      if (line.startsWith("---")) return <hr key={i} className="border-line my-4" />;
      if (line.startsWith("|")) return <div key={i} className="text-xs font-mono text-txt-dim">{line}</div>;
      if (line.match(/^\d+\./)) return <p key={i} className="ml-4 text-sm mb-1">{line}</p>;
      if (line.startsWith("- ") || line.startsWith("* ")) {
        // Handle **bold** inline
        const parts = line.slice(2).split(/(\*\*[^*]+\*\*)/g);
        return (
          <li key={i} className="ml-4 text-sm mb-1 list-disc list-inside">
            {parts.map((p, j) =>
              p.startsWith("**") && p.endsWith("**")
                ? <strong key={j}>{p.slice(2, -2)}</strong>
                : p
            )}
          </li>
        );
      }
      if (line.trim() === "") return <br key={i} />;
      const parts = line.split(/(\*\*[^*]+\*\*)/g);
      return (
        <p key={i} className="text-sm mb-1.5 leading-relaxed">
          {parts.map((p, j) =>
            p.startsWith("**") && p.endsWith("**")
              ? <strong key={j}>{p.slice(2, -2)}</strong>
              : p
          )}
        </p>
      );
    });
  };

  return (
    <div className="space-y-4">
      {!hasBlogWriter && (
        <ConnectBanner
          name="Anthropic (Claude)"
          enables="Connect Anthropic for richer, uniquely-worded blog posts. The built-in writer generates solid, ready-to-use content now."
        />
      )}

      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="field-label mb-1 block">Blog Topic</label>
          <input
            className="input w-full"
            placeholder="e.g. Top 5 reasons to invest in Jagatpura Jaipur"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
          />
        </div>
        <div>
          <label className="field-label mb-1 block">Target Keywords (comma-separated)</label>
          <input
            className="input w-full"
            placeholder="e.g. 3bhk jagatpura, flats in jaipur"
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
          />
        </div>
      </div>

      {error && (
        <div className="text-sm text-red flex items-center gap-2">
          <Icon name="AlertCircle" size={14} /> {error}
        </div>
      )}

      <button className="btn btn-primary" onClick={handleGenerate} disabled={loading}>
        {loading ? (
          <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
        ) : (
          <Icon name="PenLine" size={15} />
        )}
        {loading ? "Writing blog post…" : "Generate Blog Post"}
      </button>

      {result && (
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <h3 className="font-display font-bold text-base">Blog Preview</h3>
              {result.mode === "builtin" && <Badge tone="gold">Built-in</Badge>}
              {result.mode === "ai" && <Badge tone="green">Claude-powered</Badge>}
            </div>
            <button className="btn btn-ghost gap-1.5 text-sm" onClick={handleCopy}>
              <Icon name={copied ? "Check" : "Copy"} size={14} />
              {copied ? "Copied!" : "Copy Markdown"}
            </button>
          </div>
          <div className="prose-sm max-w-none border-t border-line pt-4">
            {renderPreview(result.markdown)}
          </div>
        </Card>
      )}

      {!result && !loading && (
        <EmptyState
          icon="PenLine"
          title="Enter a topic and generate your blog"
          hint="The AI blog writer creates ~600-word SEO-optimised content with proper H2 headings, internal linking suggestions, and Jaipur real estate context."
        />
      )}
    </div>
  );
}

// ─── Mini Sparkline SVG ────────────────────────────────────────────────────────

function Sparkline({ data, color = "#d9a441" }: { data: { value: number }[]; color?: string }) {
  const vals = data.map((d) => d.value);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const range = max - min || 1;
  const w = 80;
  const h = 28;
  const pts = vals.map((v, i) => {
    const x = (i / (vals.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 4) - 2;
    return `${x},${y}`;
  });
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none">
      <polyline points={pts.join(" ")} stroke={color} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

// ─── Tab: Rank Tracker ────────────────────────────────────────────────────────

function RankTracker() {
  const [expanded, setExpanded] = useState<number | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-txt-dim">
          Tracking {MOCK_TRACKED.length} keywords. Connect Google Search Console to pull live rankings.
        </p>
        <Badge tone="gold">Sample data</Badge>
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left">
              <th className="p-3 text-txt-dim font-semibold text-xs uppercase tracking-wide">Keyword</th>
              <th className="p-3 text-txt-dim font-semibold text-xs uppercase tracking-wide text-center">Rank</th>
              <th className="p-3 text-txt-dim font-semibold text-xs uppercase tracking-wide text-center">Change</th>
              <th className="p-3 text-txt-dim font-semibold text-xs uppercase tracking-wide hidden sm:table-cell">6-Month Trend</th>
              <th className="p-3 text-txt-dim font-semibold text-xs uppercase tracking-wide hidden md:table-cell">Page</th>
            </tr>
          </thead>
          <tbody>
            {MOCK_TRACKED.map((kw, i) => {
              const delta = kw.prev - kw.rank; // positive = rank improved (lower number)
              const isUp = delta > 0;
              const isFlat = delta === 0;
              return (
                <React.Fragment key={i}>
                  <tr
                    className="border-b border-line last:border-0 hover:bg-panel-2 transition-colors cursor-pointer"
                    onClick={() => setExpanded(expanded === i ? null : i)}
                  >
                    <td className="p-3 font-medium">{kw.keyword}</td>
                    <td className="p-3 text-center">
                      <span className={`font-display font-bold text-base ${kw.rank <= 3 ? "text-gold-bright" : kw.rank <= 10 ? "text-green" : "text-txt-dim"}`}>
                        #{kw.rank}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      {isFlat ? (
                        <span className="text-txt-faint text-sm">—</span>
                      ) : (
                        <span className={`inline-flex items-center gap-0.5 text-xs font-bold ${isUp ? "text-green" : "text-red"}`}>
                          <Icon name={isUp ? "TrendingUp" : "TrendingDown"} size={13} />
                          {Math.abs(delta)}
                        </span>
                      )}
                    </td>
                    <td className="p-3 hidden sm:table-cell w-28">
                      <Sparkline
                        data={kw.trend}
                        color={kw.rank <= 10 ? "#3ec78d" : "#d9a441"}
                      />
                    </td>
                    <td className="p-3 hidden md:table-cell text-txt-dim text-xs max-w-[160px] truncate">{kw.url}</td>
                  </tr>
                  {expanded === i && (
                    <tr className="bg-panel-2 border-b border-line">
                      <td colSpan={5} className="p-4">
                        <AreaTrend data={kw.trend} />
                        <p className="text-xs text-txt-dim mt-2">
                          Lower rank number = better position. Target: top 10 for high-intent keywords.
                        </p>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </Card>

      <p className="text-xs text-txt-faint">
        Click any row to expand the 6-month rank trend chart. Connect Google Search Console to track real rankings.
      </p>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const TABS = [
  { key: "keywords", label: "Keyword Research", icon: "SearchCheck" },
  { key: "audit", label: "Site Audit", icon: "ScanSearch" },
  { key: "blog", label: "AI Blog Writer", icon: "PenLine" },
  { key: "rank", label: "Rank Tracker", icon: "TrendingUp" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export function SeoClient({
  hasBlogWriter,
  tenantId: _tenantId,
}: {
  hasBlogWriter: boolean;
  tenantId: string;
}) {
  const [activeTab, setActiveTab] = useState<TabKey>("keywords");

  return (
    <div>
      <PageHeader
        title="SEO Genius"
        subtitle="Keyword research, site audits, AI blog writing & rank tracking for your real estate website"
        icon="SearchCheck"
        actions={
          <span className="tag bg-gold-soft text-gold-bright">
            <Icon name="Sparkles" size={12} /> AI-powered
          </span>
        }
      />

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 mb-6 p-1 bg-panel-2 rounded-[14px] w-fit">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-[10px] text-sm font-semibold transition-all ${
              activeTab === tab.key
                ? "bg-bg text-gold-bright shadow-sm"
                : "text-txt-dim hover:text-txt"
            }`}
          >
            <Icon name={tab.icon} size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "keywords" && <KeywordResearch />}
      {activeTab === "audit" && <SiteAudit />}
      {activeTab === "blog" && <AiBlogWriter hasBlogWriter={hasBlogWriter} />}
      {activeTab === "rank" && <RankTracker />}
    </div>
  );
}
