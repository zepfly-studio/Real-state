"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card, PageHeader, Badge, EmptyState, ConnectBanner } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { timeAgo } from "@/lib/format";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SocialPost {
  id: string;
  name: string;
  channel: string;
  template: string;
  audience: string;
  status: string;
  scheduledAt: string | null;
  analytics: Record<string, unknown>;
  createdAt: string;
}

interface Platform {
  key: string;
  label: string;
  icon: string;
  color: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const PLATFORMS: Platform[] = [
  { key: "INSTAGRAM", label: "Instagram", icon: "Instagram", color: "#e1306c" },
  { key: "FACEBOOK", label: "Facebook", icon: "Facebook", color: "#1877f2" },
  { key: "LINKEDIN", label: "LinkedIn", icon: "Linkedin", color: "#0a66c2" },
  { key: "TWITTER", label: "Twitter", icon: "Twitter", color: "#1da1f2" },
];

const STATUS_TONE: Record<string, "neutral" | "gold" | "green" | "blue" | "purple" | "red"> = {
  DRAFT: "neutral",
  SCHEDULED: "gold",
  SENT: "green",
  FAILED: "red",
};

const PLATFORM_META: Record<string, Platform> = Object.fromEntries(
  PLATFORMS.map((p) => [p.key, p])
);

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// ─── Platform chip ────────────────────────────────────────────────────────────

function PlatformIcon({ channel }: { channel: string }) {
  const meta = PLATFORM_META[channel];
  if (!meta) return <Badge tone="neutral">{channel}</Badge>;
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold"
      style={{ background: meta.color + "22", color: meta.color }}
    >
      <Icon name={meta.icon} size={12} />
      {meta.label}
    </span>
  );
}

// ─── Mini Calendar ────────────────────────────────────────────────────────────

function MiniCalendar({ posts }: { posts: SocialPost[] }) {
  const [viewDate, setViewDate] = useState(() => new Date());

  const scheduledDays = useMemo(() => {
    const days = new Set<string>();
    for (const p of posts) {
      if (p.scheduledAt) {
        const d = new Date(p.scheduledAt);
        if (
          d.getFullYear() === viewDate.getFullYear() &&
          d.getMonth() === viewDate.getMonth()
        ) {
          days.add(String(d.getDate()));
        }
      }
    }
    return days;
  }, [posts, viewDate]);

  const firstDay = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay();
  const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();

  const prevMonth = () =>
    setViewDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const nextMonth = () =>
    setViewDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // Pad to complete last row
  while (cells.length % 7 !== 0) cells.push(null);

  const today = new Date();

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-bold text-base">Schedule Calendar</h3>
        <div className="flex items-center gap-1">
          <button className="btn btn-ghost p-1.5" onClick={prevMonth}>
            <Icon name="ChevronLeft" size={15} />
          </button>
          <span className="text-sm font-semibold w-24 text-center">
            {MONTHS[viewDate.getMonth()]} {viewDate.getFullYear()}
          </span>
          <button className="btn btn-ghost p-1.5" onClick={nextMonth}>
            <Icon name="ChevronRight" size={15} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {DAYS_OF_WEEK.map((d) => (
          <div key={d} className="text-center text-[10px] font-semibold text-txt-faint py-1">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((day, i) => {
          if (!day) return <div key={`e-${i}`} />;
          const isToday =
            today.getDate() === day &&
            today.getMonth() === viewDate.getMonth() &&
            today.getFullYear() === viewDate.getFullYear();
          const hasPost = scheduledDays.has(String(day));
          return (
            <div
              key={day}
              className={`relative flex flex-col items-center justify-center rounded-lg h-8 text-[12px] font-medium transition-colors
                ${isToday ? "bg-gold text-[#1a1205] font-bold" : "hover:bg-panel-2"}
                ${!isToday && hasPost ? "text-gold-bright" : ""}
              `}
            >
              {day}
              {hasPost && !isToday && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-gold-bright" />
              )}
            </div>
          );
        })}
      </div>

      {scheduledDays.size > 0 && (
        <p className="text-xs text-txt-dim mt-3 text-center">
          {scheduledDays.size} day{scheduledDays.size !== 1 ? "s" : ""} with scheduled posts
        </p>
      )}
    </Card>
  );
}

// ─── Composer ────────────────────────────────────────────────────────────────

interface ComposerProps {
  hasMetaKey: boolean;
  onPosted: () => void;
}

function Composer({ hasMetaKey, onPosted }: ComposerProps) {
  const [text, setText] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(["INSTAGRAM"]);
  const [scheduleAt, setScheduleAt] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const togglePlatform = (key: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleSubmit = useCallback(async () => {
    if (!text.trim()) { setError("Post text is required."); return; }
    if (selectedPlatforms.length === 0) { setError("Select at least one platform."); return; }
    if (!scheduleAt) { setError("Schedule date/time is required."); return; }
    setError(null);
    setSubmitting(true);
    try {
      // Create one campaign per selected platform
      const promises = selectedPlatforms.map((channel) =>
        fetch("/api/social", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            channel,
            template: text.trim(),
            imageUrl: imageUrl.trim() || undefined,
            scheduledAt: scheduleAt,
          }),
        })
      );
      const responses = await Promise.all(promises);
      const failed = responses.filter((r) => !r.ok);
      if (failed.length > 0) throw new Error("Some posts failed");
      setText("");
      setImageUrl("");
      setScheduleAt("");
      setSelectedPlatforms(["INSTAGRAM"]);
      onPosted();
    } catch {
      setError("Failed to schedule post. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }, [text, selectedPlatforms, scheduleAt, imageUrl, onPosted]);

  const charCount = text.length;
  const charLimit = selectedPlatforms.includes("TWITTER") ? 280 : 2200;

  return (
    <Card className="p-5">
      <h3 className="font-display font-bold text-base mb-4">Compose Post</h3>

      {/* Platform selector */}
      <div className="mb-4">
        <label className="field-label mb-2 block">Platforms</label>
        <div className="flex flex-wrap gap-2">
          {PLATFORMS.map((p) => (
            <button
              key={p.key}
              onClick={() => togglePlatform(p.key)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold border transition-all ${
                selectedPlatforms.includes(p.key)
                  ? "border-transparent text-white"
                  : "border-line text-txt-dim hover:border-line"
              }`}
              style={
                selectedPlatforms.includes(p.key)
                  ? { background: p.color }
                  : {}
              }
            >
              <Icon name={p.icon} size={14} />
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Text */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1">
          <label className="field-label">Post Text</label>
          <span className={`text-xs ${charCount > charLimit ? "text-red" : "text-txt-faint"}`}>
            {charCount}/{charLimit}
          </span>
        </div>
        <textarea
          className="input w-full resize-none"
          rows={5}
          placeholder="Write your post... Use emojis for better engagement! 🏠✨"
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={charLimit}
        />
      </div>

      {/* Image URL */}
      <div className="mb-4">
        <label className="field-label mb-1 block">Image URL (optional)</label>
        <input
          className="input w-full"
          type="url"
          placeholder="https://cdn.example.com/property-photo.jpg"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
        />
      </div>

      {/* Schedule datetime */}
      <div className="mb-5">
        <label className="field-label mb-1 block">Schedule Date & Time</label>
        <input
          className="input w-full"
          type="datetime-local"
          value={scheduleAt}
          onChange={(e) => setScheduleAt(e.target.value)}
          min={new Date().toISOString().slice(0, 16)}
        />
      </div>

      {error && (
        <div className="text-sm text-red mb-3 flex items-center gap-2">
          <Icon name="AlertCircle" size={14} />
          {error}
        </div>
      )}

      {!hasMetaKey && (
        <p className="text-xs text-txt-dim mb-3 flex items-center gap-1">
          <Icon name="Info" size={12} className="text-gold-bright" />
          Posts are saved in-app (built-in). Connect Meta to also publish to social networks.
        </p>
      )}

      <button
        className="btn btn-primary w-full"
        onClick={handleSubmit}
        disabled={submitting}
      >
        {submitting ? (
          <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
        ) : (
          <Icon name="Send" size={15} />
        )}
        {submitting ? "Scheduling…" : `Schedule Post${selectedPlatforms.length > 1 ? ` (${selectedPlatforms.length} platforms)` : ""}`}
      </button>
    </Card>
  );
}

// ─── Queue Item ───────────────────────────────────────────────────────────────

function PostRow({
  post,
  onDelete,
  deleting,
}: {
  post: SocialPost;
  onDelete: (id: string) => void;
  deleting: boolean;
}) {
  const meta = PLATFORM_META[post.channel];

  return (
    <div className="flex items-start gap-3 p-4 border-b border-line last:border-0 hover:bg-panel-2 transition-colors group">
      {/* Platform dot */}
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{ background: (meta?.color ?? "#666") + "22", color: meta?.color ?? "#666" }}
      >
        <Icon name={meta?.icon ?? "Share2"} size={18} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center flex-wrap gap-2 mb-1">
          <PlatformIcon channel={post.channel} />
          <Badge tone={STATUS_TONE[post.status] ?? "neutral"}>{post.status}</Badge>
          {post.status === "SCHEDULED" && !post.analytics?.live && (
            <Badge tone="neutral">demo</Badge>
          )}
        </div>
        <p className="text-sm leading-snug line-clamp-2 text-txt mb-1">{post.template}</p>
        <div className="flex items-center gap-3 text-[11px] text-txt-faint">
          {post.scheduledAt ? (
            <>
              <span className="flex items-center gap-1">
                <Icon name="Clock" size={11} />
                {new Date(post.scheduledAt).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}{" "}
                {new Date(post.scheduledAt).toLocaleTimeString("en-IN", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </>
          ) : (
            <span className="flex items-center gap-1">
              <Icon name="Calendar" size={11} /> Created {timeAgo(post.createdAt)}
            </span>
          )}
          {post.audience && (
            <span className="flex items-center gap-1">
              <Icon name="Users" size={11} />
              {post.audience}
            </span>
          )}
        </div>
        {/* Analytics (if sent) */}
        {post.status === "SENT" && post.analytics && Object.keys(post.analytics).length > 0 && (
          <div className="flex items-center gap-4 mt-2 text-[11px]">
            {typeof post.analytics.reach === "number" && (
              <span className="text-blue">
                <Icon name="Eye" size={11} /> {Number(post.analytics.reach).toLocaleString()} reach
              </span>
            )}
            {typeof post.analytics.clicks === "number" && (
              <span className="text-green">
                <Icon name="MousePointerClick" size={11} /> {Number(post.analytics.clicks).toLocaleString()} clicks
              </span>
            )}
            {typeof post.analytics.likes === "number" && (
              <span className="text-purple">
                <Icon name="Heart" size={11} /> {Number(post.analytics.likes).toLocaleString()} likes
              </span>
            )}
          </div>
        )}
      </div>

      {/* Delete action */}
      {(post.status === "SCHEDULED" || post.status === "DRAFT") && (
        <button
          className="btn btn-ghost text-red p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={() => onDelete(post.id)}
          disabled={deleting}
          title="Cancel / delete post"
        >
          {deleting ? (
            <span className="animate-spin inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full" />
          ) : (
            <Icon name="Trash2" size={15} />
          )}
        </button>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function SocialClient({
  campaigns,
  hasMetaKey,
  tenantId: _tenantId,
}: {
  campaigns: SocialPost[];
  hasMetaKey: boolean;
  tenantId: string;
}) {
  const router = useRouter();
  const [posts, setPosts] = useState<SocialPost[]>(campaigns);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [filterPlatform, setFilterPlatform] = useState<string>("ALL");
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const handlePosted = useCallback(async () => {
    // Reload from server
    router.refresh();
    try {
      const res = await fetch("/api/social");
      if (res.ok) {
        const data = await res.json();
        setPosts(data.campaigns || []);
      }
    } catch {
      // ignore
    }
    showToast("Post scheduled successfully!");
  }, [router]);

  const handleDelete = useCallback(async (id: string) => {
    setDeletingIds((prev) => new Set(prev).add(id));
    try {
      const res = await fetch(`/api/social/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      setPosts((prev) => prev.filter((p) => p.id !== id));
      showToast("Post cancelled.");
    } catch {
      showToast("Failed to cancel post.");
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }, []);

  const filteredPosts = useMemo(() => {
    return posts.filter((p) => {
      if (filterStatus !== "ALL" && p.status !== filterStatus) return false;
      if (filterPlatform !== "ALL" && p.channel !== filterPlatform) return false;
      return true;
    });
  }, [posts, filterStatus, filterPlatform]);

  const scheduledCount = posts.filter((p) => p.status === "SCHEDULED").length;
  const sentCount = posts.filter((p) => p.status === "SENT").length;

  return (
    <div>
      <PageHeader
        title="Social Media"
        subtitle="Schedule & publish posts across Instagram, Facebook, LinkedIn & Twitter"
        icon="Share2"
        actions={
          <div className="flex items-center gap-2">
            <span className="tag bg-gold-soft text-gold-bright">
              {scheduledCount} scheduled
            </span>
            <span className="tag bg-[rgba(62,199,141,.14)] text-green">
              {sentCount} sent
            </span>
          </div>
        }
      />

      {!hasMetaKey && (
        <ConnectBanner
          name="Meta (Instagram / Facebook)"
          enables="Built-in scheduling is fully functional — posts are queued & tracked in-app."
        />
      )}

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Left column: Composer + Calendar */}
        <div className="lg:col-span-1 space-y-5">
          <Composer hasMetaKey={hasMetaKey} onPosted={handlePosted} />
          <MiniCalendar posts={posts} />
        </div>

        {/* Right column: Queue */}
        <div className="lg:col-span-2">
          <Card className="overflow-hidden">
            {/* Queue header */}
            <div className="flex flex-wrap items-center gap-3 p-4 border-b border-line">
              <h3 className="font-display font-bold text-base mr-auto">Post Queue</h3>
              {/* Status filter */}
              <select
                className="input py-1.5 text-sm"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="ALL">All Statuses</option>
                <option value="SCHEDULED">Scheduled</option>
                <option value="SENT">Sent</option>
                <option value="DRAFT">Draft</option>
                <option value="FAILED">Failed</option>
              </select>
              {/* Platform filter */}
              <select
                className="input py-1.5 text-sm"
                value={filterPlatform}
                onChange={(e) => setFilterPlatform(e.target.value)}
              >
                <option value="ALL">All Platforms</option>
                {PLATFORMS.map((p) => (
                  <option key={p.key} value={p.key}>{p.label}</option>
                ))}
              </select>
            </div>

            {filteredPosts.length === 0 ? (
              <EmptyState
                icon="CalendarDays"
                title="No posts yet"
                hint="Use the composer on the left to schedule your first social post."
              />
            ) : (
              <div>
                {filteredPosts.map((post) => (
                  <PostRow
                    key={post.id}
                    post={post}
                    onDelete={handleDelete}
                    deleting={deletingIds.has(post.id)}
                  />
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 card p-4 text-sm font-medium shadow-2xl border border-line animate-fade-in">
          {toast}
        </div>
      )}
    </div>
  );
}
