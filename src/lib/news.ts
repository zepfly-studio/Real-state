import { prisma } from "./prisma";

export type NewsResult = {
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

export type NewsPayload = {
  items: NewsResult[];
  isDemo: boolean;
  source: "google-news" | "seed";
};

function categorise(text: string): string {
  const t = text.toLowerCase();
  if (t.includes("rera") || t.includes("regulator") || t.includes("tribunal")) return "RERA";
  if (t.includes("rbi") || t.includes("policy") || t.includes("government") || t.includes("budget") || t.includes("subsidy") || t.includes("pmay") || t.includes("tax")) return "POLICY";
  if (t.includes("global") || t.includes("dubai") || t.includes("singapore") || t.includes("us ") || t.includes("world") || t.includes("nri")) return "GLOBAL";
  return "MARKET";
}

function stripTags(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function decode(s: string): string {
  return stripTags(s.replace(/<!\[CDATA\[|\]\]>/g, ""));
}

/**
 * Fetches live real-estate headlines from Google News RSS — NO API KEY required.
 * Falls back to seeded DB news (and finally to nothing) on any failure.
 */
export async function fetchNews(tenantId: string | null): Promise<NewsPayload> {
  try {
    const url =
      "https://news.google.com/rss/search?q=" +
      encodeURIComponent("real estate India when:14d") +
      "&hl=en-IN&gl=IN&ceid=IN:en";

    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; RealEstateOS/1.0)" },
      next: { revalidate: 1800 }, // 30-min cache
    });

    if (res.ok) {
      const xml = await res.text();
      const items: NewsResult[] = [];
      const blocks = xml.split(/<item>/).slice(1);
      for (let i = 0; i < blocks.length && items.length < 24; i++) {
        const b = blocks[i];
        const rawTitle = (b.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? "").trim();
        const link = (b.match(/<link>([\s\S]*?)<\/link>/)?.[1] ?? "").trim();
        const pub = (b.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] ?? "").trim();
        const desc = b.match(/<description>([\s\S]*?)<\/description>/)?.[1] ?? "";
        const source = (b.match(/<source[^>]*>([\s\S]*?)<\/source>/)?.[1] ?? "Google News").trim();
        if (!rawTitle) continue;

        // Google News titles are "Headline - Source"; keep headline, source separate
        const title = decode(rawTitle).replace(new RegExp(`\\s*-\\s*${source}\\s*$`), "");
        const summary = decode(desc).slice(0, 240) || null;
        const publishedAt = pub ? new Date(pub) : new Date();

        items.push({
          id: `gn-${i}`,
          category: categorise(`${title} ${summary ?? ""}`),
          title,
          summary,
          source: decode(source) || "Google News",
          url: link || null,
          imageUrl: null,
          publishedAt: isNaN(publishedAt.getTime()) ? new Date().toISOString() : publishedAt.toISOString(),
          isDemo: false,
        });
      }

      if (items.length > 0) {
        return { items, isDemo: false, source: "google-news" };
      }
    }
  } catch {
    // fall through to DB seed
  }

  // Offline fallback: seeded DB news
  try {
    const dbNews = await prisma.newsItem.findMany({
      where: tenantId ? { OR: [{ tenantId }, { tenantId: null }] } : {},
      orderBy: { publishedAt: "desc" },
      take: 20,
    });
    if (dbNews.length > 0) {
      return {
        items: dbNews.map((n) => ({
          id: n.id,
          category: n.category,
          title: n.title,
          summary: n.summary,
          source: n.source,
          url: n.url,
          imageUrl: n.imageUrl,
          publishedAt: n.publishedAt.toISOString(),
          isDemo: true,
        })),
        isDemo: true,
        source: "seed",
      };
    }
  } catch {
    // ignore
  }

  return { items: [], isDemo: true, source: "seed" };
}
