"use client";

import { useState, useCallback } from "react";
import { Card, PageHeader, Badge, ConnectBanner, EmptyState, KPICard } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { TrendLine, AreaTrend } from "@/components/charts";
import { timeAgo } from "@/lib/format";

// ─── Types ────────────────────────────────────────────────────────────────────

interface GmbReview {
  id: string;
  author: string;
  rating: number;
  text: string;
  date: string;
  replied: boolean;
  suggestedReply?: string;
}

interface GmbPost {
  id: string;
  type: "OFFER" | "UPDATE" | "EVENT";
  text: string;
  cta: string;
  createdAt: string;
  demo: boolean;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_REVIEWS: GmbReview[] = [
  {
    id: "r1",
    author: "Rajesh Sharma",
    rating: 5,
    text: "Excellent service! The team at Shubh Realtors helped us find our dream 3BHK in Jagatpura within our budget. Very professional and transparent about all charges. Highly recommended!",
    date: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
    replied: false,
  },
  {
    id: "r2",
    author: "Priya Meena",
    rating: 5,
    text: "I was skeptical about buying property in Jaipur but Shubh Realtors made the whole process seamless. Their knowledge of the Vaishali Nagar market is unmatched. Got a great deal!",
    date: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
    replied: true,
  },
  {
    id: "r3",
    author: "Amit Gupta",
    rating: 4,
    text: "Good experience overall. The site visit was well-organised and the team was knowledgeable. Would have given 5 stars but there was a slight delay in paperwork processing.",
    date: new Date(Date.now() - 8 * 24 * 3600 * 1000).toISOString(),
    replied: false,
  },
  {
    id: "r4",
    author: "Sunita Agarwal",
    rating: 5,
    text: "Bought a plot on Tonk Road through Shubh Realtors. The whole process from site visit to registration was handled by them. Zero hassle. Will definitely recommend to friends and family.",
    date: new Date(Date.now() - 12 * 24 * 3600 * 1000).toISOString(),
    replied: true,
  },
  {
    id: "r5",
    author: "Vikas Joshi",
    rating: 3,
    text: "Decent service but communication could be better. Had to follow up multiple times for updates on the paperwork. The property itself is good value for money on Ajmer Road.",
    date: new Date(Date.now() - 18 * 24 * 3600 * 1000).toISOString(),
    replied: false,
  },
  {
    id: "r6",
    author: "Kavita Singhania",
    rating: 5,
    text: "Outstanding! From the first call to possession, everything was smooth. The team genuinely cared about finding the right fit for our family. 10/10 would buy again through Shubh Realtors.",
    date: new Date(Date.now() - 22 * 24 * 3600 * 1000).toISOString(),
    replied: false,
  },
  {
    id: "r7",
    author: "Deepak Yadav",
    rating: 4,
    text: "Very helpful in navigating RERA requirements. The team ensured all documents were in order before we signed. Good transparency on pricing with no hidden costs.",
    date: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(),
    replied: true,
  },
  {
    id: "r8",
    author: "Ritu Bansal",
    rating: 5,
    text: "Best real estate experience in Jaipur! Shubh Realtors showed us 7 properties before we found the perfect 2BHK in Mansarovar. Patient, professional, and honest team.",
    date: new Date(Date.now() - 35 * 24 * 3600 * 1000).toISOString(),
    replied: false,
  },
  {
    id: "r9",
    author: "Suresh Pilania",
    rating: 5,
    text: "Invested in a commercial space in Sitapura based on their advice. Already seeing good rental yield. Very reliable team with deep market knowledge.",
    date: new Date(Date.now() - 42 * 24 * 3600 * 1000).toISOString(),
    replied: false,
  },
  {
    id: "r10",
    author: "Anita Khatri",
    rating: 4,
    text: "Good company. Helped us with a flat near C-Scheme. Pricing was fair and the team walked us through the home loan process patiently. Would use again.",
    date: new Date(Date.now() - 50 * 24 * 3600 * 1000).toISOString(),
    replied: true,
  },
];

const SUGGESTED_REPLIES: Record<number, string> = {
  5: "Thank you so much for your kind words! We're absolutely delighted to hear about your positive experience with our team. Your trust means the world to us — enjoy your new home, and please don't hesitate to reach out if you need anything in the future. 🙏🏠",
  4: "Thank you for taking the time to share your feedback! We're glad we could assist you and appreciate your constructive input. We're continuously improving our service and will take your points on board. Hope to serve you again soon!",
  3: "Thank you for your honest feedback. We sincerely apologise for the inconvenience you experienced — you deserve better. We've shared your feedback with our team and are actively working to improve our communication process. Please reach out to us directly at +91-98765-43210 and we'd love to make it right.",
  2: "We're truly sorry to hear about your experience. This is not the standard we hold ourselves to. Our customer service manager would love to speak with you personally to understand what went wrong and how we can make it right. Please call us at +91-98765-43210.",
  1: "We sincerely apologise for your experience. Every customer deserves excellent service, and we clearly fell short in this case. Our team would like to connect with you personally to resolve this. Please reach out to us directly at +91-98765-43210.",
};

const INSIGHTS_DATA = [
  { month: "Jan", calls: 42, directions: 67, websiteClicks: 189 },
  { month: "Feb", calls: 51, directions: 78, websiteClicks: 214 },
  { month: "Mar", calls: 63, directions: 94, websiteClicks: 267 },
  { month: "Apr", calls: 58, directions: 88, websiteClicks: 244 },
  { month: "May", calls: 72, directions: 105, websiteClicks: 312 },
  { month: "Jun", calls: 85, directions: 118, websiteClicks: 378 },
];

const VIEWS_DATA = [
  { label: "Jan", value: 1240 },
  { label: "Feb", value: 1480 },
  { label: "Mar", value: 1720 },
  { label: "Apr", value: 1590 },
  { label: "May", value: 1980 },
  { label: "Jun", value: 2340 },
];

// ─── Star Rating ──────────────────────────────────────────────────────────────

function StarRating({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Icon
          key={s}
          name="Star"
          size={size}
          className={s <= rating ? "text-gold-bright" : "text-line"}
        />
      ))}
    </div>
  );
}

// ─── Tab: Profile Overview ─────────────────────────────────────────────────────

function ProfileOverview({ businessName }: { businessName: string }) {
  const avgRating = parseFloat(
    (MOCK_REVIEWS.reduce((s, r) => s + r.rating, 0) / MOCK_REVIEWS.length).toFixed(1)
  );
  const fiveStars = MOCK_REVIEWS.filter((r) => r.rating === 5).length;
  const fourStars = MOCK_REVIEWS.filter((r) => r.rating === 4).length;

  return (
    <div className="space-y-5">
      {/* Profile card */}
      <Card className="p-5">
        <div className="flex flex-wrap items-start gap-5">
          <div className="w-16 h-16 rounded-2xl bg-gold-soft grid place-items-center flex-shrink-0">
            <Icon name="Building2" size={30} className="text-gold-bright" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h3 className="font-display font-bold text-xl">{businessName}</h3>
              <Badge tone="green">Verified</Badge>
            </div>
            <p className="text-txt-dim text-sm mb-2">Real Estate Agency · Jaipur, Rajasthan</p>
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <div className="flex items-center gap-1.5">
                <StarRating rating={Math.round(avgRating)} size={15} />
                <span className="font-bold text-gold-bright">{avgRating}</span>
                <span className="text-txt-faint">({MOCK_REVIEWS.length} reviews)</span>
              </div>
              <span className="flex items-center gap-1 text-txt-dim">
                <Icon name="MapPin" size={13} />
                Jagatpura, Jaipur 302017
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-1 text-sm text-txt-dim">
            <span className="flex items-center gap-1.5">
              <Icon name="Phone" size={13} className="text-gold-bright" /> +91-98765-43210
            </span>
            <span className="flex items-center gap-1.5">
              <Icon name="Globe" size={13} className="text-gold-bright" /> shubhrealtors.com
            </span>
            <span className="flex items-center gap-1.5">
              <Icon name="Clock" size={13} className="text-gold-bright" /> Mon–Sat, 9AM–7PM
            </span>
          </div>
        </div>
      </Card>

      {/* KPI grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard label="Profile Views" value="2,340" delta="+18.2%" icon="Eye" accent="blue" />
        <KPICard label="Total Reviews" value={String(MOCK_REVIEWS.length)} delta="+3" icon="Star" accent="gold" />
        <KPICard label="Avg. Rating" value={String(avgRating)} delta="+0.2" icon="TrendingUp" accent="green" />
        <KPICard label="Search Impressions" value="8.4K" delta="+22.1%" icon="Search" accent="purple" />
      </div>

      {/* Rating breakdown + trend */}
      <div className="grid lg:grid-cols-2 gap-5">
        <Card className="p-5">
          <h3 className="font-display font-bold text-base mb-4">Rating Breakdown</h3>
          {[5, 4, 3, 2, 1].map((s) => {
            const count = MOCK_REVIEWS.filter((r) => r.rating === s).length;
            const pct = (count / MOCK_REVIEWS.length) * 100;
            return (
              <div key={s} className="flex items-center gap-3 mb-2">
                <div className="flex items-center gap-0.5 w-16 flex-shrink-0">
                  <span className="text-xs font-semibold w-3">{s}</span>
                  <Icon name="Star" size={11} className="text-gold-bright" />
                </div>
                <div className="flex-1 h-2 rounded-full bg-bg-2 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gold"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-xs text-txt-dim w-6 text-right">{count}</span>
              </div>
            );
          })}
          <div className="mt-3 pt-3 border-t border-line flex items-center justify-between text-xs text-txt-dim">
            <span>5-star reviews: <strong className="text-green">{fiveStars}</strong></span>
            <span>4-star reviews: <strong className="text-gold-bright">{fourStars}</strong></span>
            <span>Response rate: <strong className="text-blue">40%</strong></span>
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="font-display font-bold text-base mb-1">Profile Views Trend</h3>
          <p className="text-txt-dim text-xs mb-3">Last 6 months</p>
          <AreaTrend data={VIEWS_DATA} />
        </Card>
      </div>
    </div>
  );
}

// ─── Tab: Reviews ─────────────────────────────────────────────────────────────

function ReviewsTab() {
  const [reviews, setReviews] = useState<GmbReview[]>(MOCK_REVIEWS);
  const [loadingReply, setLoadingReply] = useState<string | null>(null);
  const [filterRating, setFilterRating] = useState(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  function handleCopyReply(reviewId: string, text: string) {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopiedId(reviewId);
    setTimeout(() => setCopiedId(null), 2000);
  }

  const handleSuggestReply = useCallback(async (reviewId: string, rating: number) => {
    setLoadingReply(reviewId);
    // Simulate brief delay (would call API in live mode)
    await new Promise((r) => setTimeout(r, 600));
    const reply = SUGGESTED_REPLIES[rating] ?? SUGGESTED_REPLIES[3];
    setReviews((prev) =>
      prev.map((r) => (r.id === reviewId ? { ...r, suggestedReply: reply } : r))
    );
    setLoadingReply(null);
  }, []);

  const filteredReviews = filterRating === 0
    ? reviews
    : reviews.filter((r) => r.rating === filterRating);

  const avgRating = parseFloat(
    (MOCK_REVIEWS.reduce((s, r) => s + r.rating, 0) / MOCK_REVIEWS.length).toFixed(1)
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <StarRating rating={Math.round(avgRating)} size={16} />
          <span className="font-display font-bold text-xl text-gold-bright">{avgRating}</span>
          <span className="text-txt-dim text-sm">({reviews.length} reviews)</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <label className="text-sm text-txt-dim">Filter:</label>
          <select
            className="input py-1.5 text-sm"
            value={filterRating}
            onChange={(e) => setFilterRating(Number(e.target.value))}
          >
            <option value={0}>All ratings</option>
            {[5, 4, 3, 2, 1].map((s) => (
              <option key={s} value={s}>{s} star{s !== 1 ? "s" : ""}</option>
            ))}
          </select>
        </div>
      </div>

      {filteredReviews.length === 0 && (
        <EmptyState icon="Star" title="No reviews for this rating" />
      )}

      <div className="space-y-3">
        {filteredReviews.map((review) => (
          <Card key={review.id} className="p-4">
            <div className="flex items-start gap-3">
              <div
                className="w-9 h-9 rounded-full flex-shrink-0 grid place-items-center text-sm font-bold text-[#1a1205]"
                style={{ background: "#d9a441" }}
              >
                {review.author.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="font-semibold text-sm">{review.author}</span>
                  <StarRating rating={review.rating} size={12} />
                  <span className="text-xs text-txt-faint ml-auto">{timeAgo(review.date)}</span>
                  {review.replied && (
                    <Badge tone="green">Replied</Badge>
                  )}
                </div>
                <p className="text-sm text-txt-dim leading-relaxed">{review.text}</p>

                {review.suggestedReply && (
                  <div className="mt-3 p-3 bg-panel-2 rounded-xl border border-line text-sm">
                    <div className="flex items-center gap-1.5 mb-1.5 text-xs font-semibold text-gold-bright">
                      <Icon name="Sparkles" size={12} />
                      Suggested Reply
                    </div>
                    <p className="text-txt-dim leading-relaxed">{review.suggestedReply}</p>
                    <button
                      className="btn btn-ghost mt-2 text-xs gap-1"
                      onClick={() => handleCopyReply(review.id, review.suggestedReply!)}
                    >
                      <Icon name={copiedId === review.id ? "Check" : "Copy"} size={12} />
                      {copiedId === review.id ? "Copied!" : "Copy Reply"}
                    </button>
                  </div>
                )}

                {!review.replied && !review.suggestedReply && (
                  <button
                    className="btn btn-ghost mt-2 text-xs gap-1.5"
                    onClick={() => handleSuggestReply(review.id, review.rating)}
                    disabled={loadingReply === review.id}
                  >
                    {loadingReply === review.id ? (
                      <span className="animate-spin inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full" />
                    ) : (
                      <Icon name="Sparkles" size={12} />
                    )}
                    {loadingReply === review.id ? "Drafting…" : "Suggest Reply"}
                  </button>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── Tab: Insights ─────────────────────────────────────────────────────────────

function InsightsTab() {
  const latestMonth = INSIGHTS_DATA[INSIGHTS_DATA.length - 1];
  const prevMonth = INSIGHTS_DATA[INSIGHTS_DATA.length - 2];

  const callsDelta = (((latestMonth.calls - prevMonth.calls) / prevMonth.calls) * 100).toFixed(1);
  const dirDelta = (((latestMonth.directions - prevMonth.directions) / prevMonth.directions) * 100).toFixed(1);
  const webDelta = (((latestMonth.websiteClicks - prevMonth.websiteClicks) / prevMonth.websiteClicks) * 100).toFixed(1);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <KPICard
          label="Calls This Month"
          value={String(latestMonth.calls)}
          delta={`+${callsDelta}%`}
          icon="Phone"
          accent="green"
        />
        <KPICard
          label="Direction Requests"
          value={String(latestMonth.directions)}
          delta={`+${dirDelta}%`}
          icon="Navigation"
          accent="blue"
        />
        <KPICard
          label="Website Clicks"
          value={String(latestMonth.websiteClicks)}
          delta={`+${webDelta}%`}
          icon="MousePointerClick"
          accent="purple"
        />
      </div>

      <Card className="p-5">
        <h3 className="font-display font-bold text-base mb-1">Customer Actions — 6 Month Trend</h3>
        <p className="text-txt-dim text-xs mb-4">Calls, direction requests & website clicks from your Google Business Profile</p>
        <TrendLine
          data={INSIGHTS_DATA}
          keys={[
            { key: "websiteClicks", color: "#9b7ef0" },
            { key: "directions", color: "#5b8def" },
            { key: "calls", color: "#3ec78d" },
          ]}
        />
      </Card>

      <div className="grid lg:grid-cols-2 gap-5">
        <Card className="p-5">
          <h3 className="font-display font-bold text-base mb-4">How Customers Found You</h3>
          <div className="space-y-3">
            {[
              { label: "Direct search (business name)", value: 42, color: "#d9a441" },
              { label: "Discovery search (category/service)", value: 38, color: "#5b8def" },
              { label: "Branded maps search", value: 15, color: "#3ec78d" },
              { label: "Google Maps embed", value: 5, color: "#9b7ef0" },
            ].map((item) => (
              <div key={item.label}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-txt-dim">{item.label}</span>
                  <span className="font-semibold">{item.value}%</span>
                </div>
                <div className="h-2 rounded-full bg-bg-2 overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${item.value}%`, background: item.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="font-display font-bold text-base mb-4">Top Search Queries</h3>
          <div className="space-y-2">
            {[
              { query: "shubh realtors jaipur", count: 324 },
              { query: "real estate agent jaipur", count: 187 },
              { query: "3bhk flats jagatpura", count: 143 },
              { query: "property dealer near me", count: 118 },
              { query: "buy flat jaipur", count: 96 },
              { query: "jaipur property investment", count: 74 },
            ].map((item) => (
              <div key={item.query} className="flex items-center justify-between text-sm py-1.5 border-b border-line last:border-0">
                <span className="text-txt-dim flex items-center gap-1.5">
                  <Icon name="Search" size={12} className="text-gold-bright" />
                  {item.query}
                </span>
                <span className="font-semibold text-txt">{item.count.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

// ─── Tab: Posts ───────────────────────────────────────────────────────────────

const POST_TYPE_META: Record<string, { label: string; color: string; icon: string }> = {
  OFFER: { label: "Offer", color: "#3ec78d", icon: "Tag" },
  UPDATE: { label: "Update", color: "#5b8def", icon: "Bell" },
  EVENT: { label: "Event", color: "#9b7ef0", icon: "CalendarDays" },
};

const CTA_OPTIONS = [
  "Learn More",
  "Call Now",
  "Book Now",
  "Get Offer",
  "Order Online",
  "Sign Up",
];

function PostsTab({ isLive }: { isLive: boolean }) {
  const [posts, setPosts] = useState<GmbPost[]>([
    {
      id: "p1",
      type: "OFFER",
      text: "🏠 Limited Time: Get ₹1L off on select 3BHK units in Jagatpura. RERA-approved project. Book your site visit today!",
      cta: "Book Now",
      createdAt: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
      demo: true,
    },
    {
      id: "p2",
      type: "UPDATE",
      text: "We're excited to announce the launch of our new listing portal! Browse 200+ RERA-registered properties across Jaipur with virtual tour support.",
      cta: "Learn More",
      createdAt: new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString(),
      demo: true,
    },
    {
      id: "p3",
      type: "EVENT",
      text: "🎪 Jaipur Property Expo 2024 — Join us at Jawahar Lal Nehru Marg, Jaipur on June 15-16. Explore 50+ projects, best prices guaranteed. Free entry!",
      cta: "Sign Up",
      createdAt: new Date(Date.now() - 20 * 24 * 3600 * 1000).toISOString(),
      demo: true,
    },
  ]);

  const [type, setType] = useState<"OFFER" | "UPDATE" | "EVENT">("UPDATE");
  const [text, setText] = useState("");
  const [cta, setCta] = useState("Learn More");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handlePost = useCallback(async () => {
    if (!text.trim()) { setError("Post text is required."); return; }
    setError(null);
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 600));
    const newPost: GmbPost = {
      id: `p-${Date.now()}`,
      type,
      text: text.trim(),
      cta,
      createdAt: new Date().toISOString(),
      demo: !isLive,
    };
    setPosts((prev) => [newPost, ...prev]);
    setText("");
    setSubmitting(false);
    showToast(isLive ? "Post published to Google Business Profile!" : "Post saved successfully.");
  }, [text, type, cta, isLive]);

  return (
    <div className="space-y-5">
      {/* Composer */}
      <Card className="p-5">
        <h3 className="font-display font-bold text-base mb-4">Create GMB Post</h3>

        {/* Post type */}
        <div className="mb-4">
          <label className="field-label mb-2 block">Post Type</label>
          <div className="flex gap-2 flex-wrap">
            {(["OFFER", "UPDATE", "EVENT"] as const).map((t) => {
              const meta = POST_TYPE_META[t];
              return (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold border transition-all ${
                    type === t ? "border-transparent text-white" : "border-line text-txt-dim hover:border-gold"
                  }`}
                  style={type === t ? { background: meta.color } : {}}
                >
                  <Icon name={meta.icon} size={13} />
                  {meta.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Text */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1">
            <label className="field-label">Post Text</label>
            <span className={`text-xs ${text.length > 1450 ? "text-red" : "text-txt-faint"}`}>{text.length}/1500</span>
          </div>
          <textarea
            className="input w-full resize-none"
            rows={4}
            placeholder={
              type === "OFFER"
                ? "Describe your offer — discount amount, validity, property type..."
                : type === "EVENT"
                ? "Event name, date, venue, key highlights..."
                : "Share an update about your business, new listings, or achievements..."
            }
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={1500}
          />
        </div>

        {/* CTA */}
        <div className="mb-5">
          <label className="field-label mb-1 block">Call-to-Action Button</label>
          <select
            className="input"
            value={cta}
            onChange={(e) => setCta(e.target.value)}
          >
            {CTA_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {error && (
          <div className="text-sm text-red mb-3 flex items-center gap-2">
            <Icon name="AlertCircle" size={14} /> {error}
          </div>
        )}

        {!isLive && (
          <p className="text-xs text-txt-dim mb-3 flex items-center gap-1">
            <Icon name="Info" size={12} className="text-gold-bright" />
            Posts are saved in-app (built-in). Connect Google Business Profile to also publish live.
          </p>
        )}

        <button
          className="btn btn-primary"
          onClick={handlePost}
          disabled={submitting}
        >
          {submitting ? (
            <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
          ) : (
            <Icon name="Send" size={15} />
          )}
          {submitting ? "Publishing…" : isLive ? "Publish to Google" : "Save Post"}
        </button>
      </Card>

      {/* Posts list */}
      {posts.length === 0 ? (
        <EmptyState icon="FileText" title="No posts yet" hint="Create your first GMB post above." />
      ) : (
        <div className="space-y-3">
          {posts.map((post) => {
            const meta = POST_TYPE_META[post.type];
            return (
              <Card key={post.id} className="p-4">
                <div className="flex items-start gap-3">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: meta.color + "22", color: meta.color }}
                  >
                    <Icon name={meta.icon} size={17} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center flex-wrap gap-2 mb-1">
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold"
                        style={{ background: meta.color + "22", color: meta.color }}
                      >
                        {meta.label}
                      </span>
                      {post.demo && <Badge tone="neutral">Demo</Badge>}
                      <span className="text-xs text-txt-faint ml-auto">{timeAgo(post.createdAt)}</span>
                    </div>
                    <p className="text-sm text-txt leading-relaxed mb-1">{post.text}</p>
                    <span className="tag bg-panel-2 text-txt-dim text-xs">
                      <Icon name="MousePointerClick" size={11} className="inline mr-1" />
                      {post.cta}
                    </span>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 card p-4 text-sm font-medium shadow-2xl border border-line animate-fade-in">
          {toast}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const TABS = [
  { key: "profile", label: "Profile", icon: "Building2" },
  { key: "reviews", label: "Reviews", icon: "Star" },
  { key: "insights", label: "Insights", icon: "BarChart2" },
  { key: "posts", label: "Posts", icon: "FileText" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export function GmbClient({
  businessName,
  isLive,
  tenantId: _tenantId,
}: {
  businessName: string;
  isLive: boolean;
  tenantId: string;
}) {
  const [activeTab, setActiveTab] = useState<TabKey>("profile");

  const avgRating = parseFloat(
    (MOCK_REVIEWS.reduce((s, r) => s + r.rating, 0) / MOCK_REVIEWS.length).toFixed(1)
  );

  return (
    <div>
      <PageHeader
        title="GMB Data Extractor"
        subtitle="Manage your Google Business Profile — reviews, insights & posts"
        icon="MapPin"
        actions={
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <Icon name="Star" size={14} className="text-gold-bright" />
              <span className="font-bold text-gold-bright">{avgRating}</span>
            </div>
            {isLive ? (
              <Badge tone="green">Live</Badge>
            ) : (
              <Badge tone="gold">Sample data</Badge>
            )}
          </div>
        }
      />

      {!isLive && (
        <ConnectBanner
          name="Google Business Profile + Google Maps"
          enables="The reviews, ratings and insights below are SAMPLE data for demonstration. Connect Google Business Profile in Settings to pull your real reviews & insights."
        />
      )}

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 mb-6 p-1 bg-panel-2 rounded-[14px] w-fit">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-[10px] text-sm font-semibold transition-all ${
              activeTab === tab.key
                ? "bg-panel text-gold-bright shadow-sm border border-line"
                : "text-txt-dim hover:text-txt"
            }`}
          >
            <Icon name={tab.icon} size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "profile" && <ProfileOverview businessName={businessName} />}
      {activeTab === "reviews" && <ReviewsTab />}
      {activeTab === "insights" && <InsightsTab />}
      {activeTab === "posts" && <PostsTab isLive={isLive} />}
    </div>
  );
}
