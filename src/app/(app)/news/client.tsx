"use client";

import { useState } from "react";
import { Card, PageHeader, Badge, EmptyState } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { timeAgo } from "@/lib/format";

type NewsItem = {
  id: string;
  category: string;
  title: string;
  summary: string | null;
  source: string;
  url: string | null;
  imageUrl: string | null;
  publishedAt: string;
  isDemo: boolean;
};

type Props = {
  items: NewsItem[];
  isDemo: boolean;
};

const FILTERS = ["ALL", "MARKET", "POLICY", "RERA", "GLOBAL"] as const;

const CATEGORY_META: Record<string, { label: string; tone: "gold" | "green" | "blue" | "purple" | "red" | "neutral"; icon: string }> = {
  MARKET: { label: "Market", tone: "gold", icon: "TrendingUp" },
  POLICY: { label: "Policy", tone: "blue", icon: "Landmark" },
  RERA: { label: "RERA", tone: "purple", icon: "ShieldCheck" },
  GLOBAL: { label: "Global", tone: "green", icon: "Globe2" },
};

function CategoryBadge({ category }: { category: string }) {
  const meta = CATEGORY_META[category] ?? { label: category, tone: "neutral" as const, icon: "Tag" };
  return (
    <Badge tone={meta.tone}>
      <span className="flex items-center gap-1">
        <Icon name={meta.icon} size={10} />
        {meta.label}
      </span>
    </Badge>
  );
}

function NewsCard({ item }: { item: NewsItem }) {
  return (
    <a
      href={item.url ?? "#"}
      target={item.url ? "_blank" : undefined}
      rel="noreferrer"
      className="block card p-5 hover:border-gold/30 transition-colors group"
    >
      <div className="flex items-start gap-4">
        {/* Left: icon / thumbnail */}
        <div className="grid place-items-center w-10 h-10 rounded-xl bg-gold-soft text-gold-bright shrink-0 mt-0.5">
          <Icon
            name={CATEGORY_META[item.category]?.icon ?? "Newspaper"}
            size={18}
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <CategoryBadge category={item.category} />
            <span className="text-txt-faint text-[11px]">{item.source}</span>
            <span className="text-txt-faint text-[11px]">·</span>
            <span className="text-txt-faint text-[11px]">{timeAgo(item.publishedAt)}</span>
          </div>

          <h3 className="font-display font-semibold text-[15px] leading-snug group-hover:text-gold-bright transition-colors line-clamp-2">
            {item.title}
          </h3>

          {item.summary && (
            <p className="text-txt-dim text-sm mt-1.5 leading-relaxed line-clamp-2">
              {item.summary}
            </p>
          )}

          {item.url && (
            <div className="flex items-center gap-1 mt-2 text-gold-bright text-xs font-semibold">
              Read more
              <Icon name="ExternalLink" size={11} />
            </div>
          )}
        </div>
      </div>
    </a>
  );
}

export default function NewsClient({ items, isDemo }: Props) {
  const [activeFilter, setActiveFilter] = useState<string>("ALL");

  const filtered =
    activeFilter === "ALL"
      ? items
      : items.filter((i) => i.category === activeFilter);

  // Category counts
  const counts = FILTERS.reduce<Record<string, number>>((acc, f) => {
    acc[f] = f === "ALL" ? items.length : items.filter((i) => i.category === f).length;
    return acc;
  }, {});

  return (
    <div>
      <PageHeader
        title="Property Live News"
        subtitle="Latest real estate news from across India & the world."
        icon="Newspaper"
      />

      {isDemo && (
        <div className="flex items-center gap-2 mb-5 px-4 py-2.5 rounded-xl bg-panel-2 border border-line text-sm text-txt-faint">
          <Icon name="WifiOff" size={14} />
          Showing saved headlines (offline)
        </div>
      )}

      {/* Filter chips */}
      <div className="flex flex-wrap gap-2 mb-6">
        {FILTERS.map((f) => {
          const active = activeFilter === f;
          const meta = CATEGORY_META[f];
          return (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-semibold transition-all border ${
                active
                  ? "bg-gold text-[#1a1205] border-gold"
                  : "bg-transparent text-txt-dim border-line hover:border-gold/40 hover:text-txt"
              }`}
            >
              {meta && <Icon name={meta.icon} size={12} />}
              {f === "ALL" ? "All" : meta?.label ?? f}
              <span
                className={`text-[11px] rounded-full px-1.5 ${
                  active ? "bg-black/20 text-[#1a1205]" : "bg-bg-2 text-txt-faint"
                }`}
              >
                {counts[f]}
              </span>
            </button>
          );
        })}
      </div>

      {/* News Grid */}
      {filtered.length === 0 ? (
        <EmptyState
          icon="Newspaper"
          title="No news in this category"
          hint="Try switching the filter above."
        />
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((item) => (
            <NewsCard key={item.id} item={item} />
          ))}
        </div>
      )}

    </div>
  );
}
