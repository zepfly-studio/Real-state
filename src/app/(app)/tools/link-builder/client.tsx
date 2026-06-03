"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, PageHeader, Badge, EmptyState } from "@/components/ui";
import { Icon } from "@/components/Icon";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Block {
  id: string;
  type: "link" | "heading";
  label: string;
  url?: string;
}

interface Theme {
  bg?: string;
  accent?: string;
  textColor?: string;
}

interface LinkPageData {
  id: string;
  slug: string;
  title: string;
  bio: string;
  avatarUrl: string;
  theme: Theme;
  blocks: Block[];
  published: boolean;
  views: number;
  createdAt: string;
}

interface Props {
  initialPage: LinkPageData | null;
  tenantId: string;
}

// ─── Default seed data ────────────────────────────────────────────────────────

const DEFAULT_THEME: Theme = {
  bg: "#0f1219",
  accent: "#d9a441",
  textColor: "#ffffff",
};

const DEFAULT_BLOCKS: Block[] = [
  { id: "b1", type: "heading", label: "Explore Our Projects" },
  { id: "b2", type: "link", label: "Shubh Heights — 3BHK Jagatpura", url: "https://shubhrealtors.com/shubh-heights" },
  { id: "b3", type: "link", label: "Shubh Greens — Villas C-Scheme", url: "https://shubhrealtors.com/shubh-greens" },
  { id: "b4", type: "link", label: "Book a Site Visit", url: "https://shubhrealtors.com/site-visit" },
  { id: "b5", type: "heading", label: "Quick Links" },
  { id: "b6", type: "link", label: "WhatsApp Us", url: "https://wa.me/919876543210" },
  { id: "b7", type: "link", label: "EMI Calculator", url: "https://shubhrealtors.com/emi" },
];

function newId() {
  return `b${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

// ─── Sortable Block Item ──────────────────────────────────────────────────────

function SortableBlock({
  block,
  onEdit,
  onDelete,
}: {
  block: Block;
  onEdit: (b: Block) => void;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 p-3 rounded-xl border border-line bg-panel-2 group ${
        isDragging ? "shadow-lg" : ""
      }`}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-txt-faint hover:text-txt-dim p-1 touch-none"
        aria-label="Drag to reorder"
      >
        <Icon name="GripVertical" size={16} />
      </button>

      {/* Type icon */}
      <div className="text-txt-faint flex-shrink-0">
        <Icon name={block.type === "heading" ? "Heading2" : "Link"} size={15} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{block.label || <span className="text-txt-faint italic">Untitled</span>}</div>
        {block.type === "link" && block.url && (
          <div className="text-xs text-txt-faint truncate">{block.url}</div>
        )}
      </div>

      {/* Badge */}
      <span className="hidden group-hover:inline-flex">
        <Badge tone={block.type === "heading" ? "purple" : "blue"}>
          {block.type}
        </Badge>
      </span>

      {/* Actions */}
      <div className="flex gap-1 ml-1">
        <button
          onClick={() => onEdit(block)}
          className="btn btn-ghost p-1.5 text-txt-faint hover:text-gold-bright"
          aria-label="Edit block"
        >
          <Icon name="Pencil" size={14} />
        </button>
        <button
          onClick={() => onDelete(block.id)}
          className="btn btn-ghost p-1.5 text-txt-faint hover:text-red"
          aria-label="Delete block"
        >
          <Icon name="Trash2" size={14} />
        </button>
      </div>
    </div>
  );
}

// ─── Block Edit Modal ─────────────────────────────────────────────────────────

function BlockEditModal({
  block,
  onSave,
  onClose,
}: {
  block: Partial<Block> & { type: "link" | "heading" };
  onSave: (b: Block) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<Block>({
    id: block.id ?? newId(),
    type: block.type,
    label: block.label ?? "",
    url: block.url ?? "",
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.label.trim()) return;
    onSave({ ...form, label: form.label.trim(), url: form.type === "link" ? form.url?.trim() : undefined });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div className="card p-5 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-semibold">
            {block.id ? "Edit Block" : "Add Block"}
          </h3>
          <button onClick={onClose} className="btn btn-ghost p-1.5"><Icon name="X" size={15} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="field-label">Block Type</label>
            <div className="flex gap-2">
              {(["link", "heading"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, type: t }))}
                  className={`btn flex-1 text-sm capitalize ${form.type === t ? "btn-primary" : "btn-ghost"}`}
                >
                  <Icon name={t === "heading" ? "Heading2" : "Link"} size={13} />
                  <span className="ml-1">{t}</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="field-label">Label *</label>
            <input
              className="input w-full"
              placeholder={form.type === "heading" ? "Explore Our Projects" : "Book a Site Visit"}
              value={form.label}
              onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
              required
            />
          </div>
          {form.type === "link" && (
            <div>
              <label className="field-label">URL</label>
              <input
                className="input w-full"
                placeholder="https://shubhrealtors.com/..."
                value={form.url ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
                type="url"
              />
            </div>
          )}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn btn-ghost flex-1">Cancel</button>
            <button type="submit" className="btn btn-primary flex-1">Save Block</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Phone Preview ────────────────────────────────────────────────────────────

function PhonePreview({
  title,
  bio,
  avatarUrl,
  theme,
  blocks,
}: {
  title: string;
  bio: string;
  avatarUrl: string;
  theme: Theme;
  blocks: Block[];
}) {
  const bg = theme.bg || DEFAULT_THEME.bg!;
  const accent = theme.accent || DEFAULT_THEME.accent!;
  const textColor = theme.textColor || DEFAULT_THEME.textColor!;

  return (
    <div className="flex flex-col items-center">
      <p className="section-label mb-3 text-center">Live Preview</p>
      {/* Phone frame */}
      <div
        className="relative rounded-[40px] overflow-hidden shadow-2xl border-[6px] border-[#2a3045]"
        style={{ width: 280, height: 560 }}
      >
        {/* Screen */}
        <div
          className="absolute inset-0 overflow-y-auto"
          style={{ background: bg, color: textColor }}
        >
          {/* Status bar mock */}
          <div className="flex items-center justify-between px-5 pt-3 pb-1 text-[10px] opacity-60">
            <span>9:41</span>
            <div className="flex gap-1">
              <span>●●●</span>
              <span>WiFi</span>
              <span>100%</span>
            </div>
          </div>

          <div className="px-5 py-4 flex flex-col items-center text-center">
            {/* Avatar */}
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={title}
                className="w-16 h-16 rounded-full object-cover mb-3 border-2"
                style={{ borderColor: accent }}
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            ) : (
              <div
                className="w-16 h-16 rounded-full mb-3 flex items-center justify-center text-2xl font-bold border-2"
                style={{ background: accent, borderColor: accent, color: bg }}
              >
                {title ? title[0].toUpperCase() : "S"}
              </div>
            )}
            {/* Title */}
            <div className="font-bold text-base leading-tight mb-1" style={{ color: textColor }}>
              {title || "Your Brand"}
            </div>
            {/* Bio */}
            {bio && (
              <p className="text-xs opacity-70 leading-relaxed mb-4" style={{ color: textColor }}>
                {bio}
              </p>
            )}
          </div>

          {/* Blocks */}
          <div className="px-4 space-y-2 pb-8">
            {blocks.map((block) => {
              if (block.type === "heading") {
                return (
                  <div key={block.id} className="text-center py-2">
                    <span className="text-[11px] uppercase tracking-widest font-semibold opacity-60" style={{ color: textColor }}>
                      {block.label}
                    </span>
                  </div>
                );
              }
              return (
                <div
                  key={block.id}
                  className="rounded-xl py-3 px-4 text-center text-sm font-semibold transition-all cursor-pointer"
                  style={{
                    background: accent,
                    color: bg,
                    boxShadow: `0 2px 12px ${accent}40`,
                  }}
                >
                  {block.label}
                </div>
              );
            })}
          </div>
        </div>

        {/* Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-5 bg-[#2a3045] rounded-b-2xl z-10" />
      </div>

      {/* URL bar */}
      <div className="mt-3 text-xs text-txt-faint font-mono bg-panel-2 px-3 py-1.5 rounded-lg">
        /p/…
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function LinkBuilderClient({ initialPage, tenantId }: Props) {
  const router = useRouter();

  // Form state — initialize from existing page or defaults
  const [title, setTitle] = useState(initialPage?.title ?? "Shubh Realtors");
  const [bio, setBio] = useState(
    initialPage?.bio ?? "Jaipur's most trusted real estate brand. RERA approved projects in prime locations."
  );
  const [avatarUrl, setAvatarUrl] = useState(initialPage?.avatarUrl ?? "");
  const [theme, setTheme] = useState<Theme>(
    initialPage?.theme && Object.keys(initialPage.theme).length > 0
      ? initialPage.theme
      : DEFAULT_THEME
  );
  const [blocks, setBlocks] = useState<Block[]>(
    (initialPage?.blocks?.length ? initialPage.blocks : DEFAULT_BLOCKS).map((b, i) => ({
      ...b,
      id: b.id ?? `b${i}`, // deterministic ids (seeded blocks may lack one) — stable for SSR + dnd keys
    }))
  );
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const [published, setPublished] = useState(initialPage?.published ?? false);
  const [slug, setSlug] = useState(initialPage?.slug ?? "shubh-realtors");

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [editingBlock, setEditingBlock] = useState<(Partial<Block> & { type: "link" | "heading" }) | null>(null);
  const [copied, setCopied] = useState(false);

  const publicUrl = `/p/${slug}`;

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setBlocks((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }

  function handleAddBlock(type: "link" | "heading") {
    setEditingBlock({ type, label: "", url: "" });
  }

  function handleSaveBlock(block: Block) {
    setBlocks((prev) => {
      const idx = prev.findIndex((b) => b.id === block.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = block;
        return next;
      }
      return [...prev, block];
    });
    setEditingBlock(null);
  }

  function handleDeleteBlock(id: string) {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
  }

  async function handleSave() {
    setSaving(true);
    setSaveError("");
    try {
      const res = await fetch("/api/link-pages", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          title,
          bio,
          avatarUrl,
          theme,
          blocks,
          published,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setSaveError(d.error ?? "Failed to save");
      } else {
        const updated = await res.json();
        setSlug(updated.slug ?? slug);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
        router.refresh();
      }
    } catch {
      setSaveError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  function handleCopyUrl() {
    const fullUrl = `${window.location.origin}${publicUrl}`;
    navigator.clipboard.writeText(fullUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  }

  return (
    <div>
      <PageHeader
        title="Link Page Builder"
        subtitle="Create a branded link-in-bio page for social profiles and marketing."
        icon="Link"
        actions={
          <div className="flex items-center gap-2">
            {/* Published toggle */}
            <button
              onClick={() => setPublished((v) => !v)}
              className={`flex items-center gap-2 btn text-sm ${
                published ? "btn-primary" : "btn-ghost"
              }`}
            >
              <Icon name={published ? "Eye" : "EyeOff"} size={14} />
              {published ? "Published" : "Draft"}
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn btn-primary flex items-center gap-2"
            >
              <Icon name={saved ? "CheckCheck" : "Save"} size={15} />
              {saving ? "Saving…" : saved ? "Saved!" : "Save"}
            </button>
          </div>
        }
      />

      {/* Public URL bar */}
      <div className="flex items-center gap-3 mb-6 p-3 bg-panel-2 rounded-xl border border-line">
        <Icon name="Globe" size={16} className="text-gold-bright flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <span className="text-txt-faint text-sm">{mounted ? window.location.origin : ""}</span>
          <span className="text-gold-bright font-semibold text-sm">{publicUrl}</span>
        </div>
        <button
          onClick={handleCopyUrl}
          className="btn btn-ghost text-xs flex items-center gap-1.5"
        >
          <Icon name={copied ? "CheckCheck" : "Copy"} size={13} />
          {copied ? "Copied!" : "Copy"}
        </button>
        <a
          href={publicUrl}
          target="_blank"
          rel="noreferrer"
          className="btn btn-ghost text-xs flex items-center gap-1.5"
        >
          <Icon name="ExternalLink" size={13} />
          Open
        </a>
        {initialPage?.views != null && (
          <div className="text-xs text-txt-faint flex items-center gap-1 ml-1">
            <Icon name="Eye" size={12} />
            {initialPage.views} views
          </div>
        )}
      </div>

      {saveError && (
        <div className="mb-4 p-3 bg-red/10 border border-red/30 rounded-xl text-sm text-red flex items-center gap-2">
          <Icon name="AlertCircle" size={15} />
          {saveError}
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* ── Left: Editor ────────────────────────────────────────────────── */}
        <div className="space-y-4">
          {/* Profile */}
          <Card className="p-5 space-y-4">
            <h3 className="font-display font-semibold text-base flex items-center gap-2">
              <Icon name="User" size={16} className="text-gold-bright" />
              Profile
            </h3>
            <div>
              <label className="field-label">Page Title</label>
              <input
                className="input w-full"
                placeholder="Shubh Realtors"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div>
              <label className="field-label">Bio</label>
              <textarea
                className="input w-full resize-none"
                rows={3}
                placeholder="Jaipur's most trusted real estate brand…"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
              />
            </div>
            <div>
              <label className="field-label">Avatar URL</label>
              <input
                className="input w-full"
                placeholder="https://cdn.example.com/logo.png"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                type="url"
              />
            </div>
            <div>
              <label className="field-label">Page Slug (URL path)</label>
              <div className="flex items-center gap-2">
                <span className="text-txt-faint text-sm">/p/</span>
                <input
                  className="input flex-1"
                  placeholder="shubh-realtors"
                  value={slug}
                  onChange={(e) =>
                    setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-"))
                  }
                />
              </div>
            </div>
          </Card>

          {/* Theme */}
          <Card className="p-5 space-y-4">
            <h3 className="font-display font-semibold text-base flex items-center gap-2">
              <Icon name="Palette" size={16} className="text-gold-bright" />
              Theme
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="field-label">Background</label>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="color"
                    value={theme.bg ?? DEFAULT_THEME.bg}
                    onChange={(e) => setTheme((t) => ({ ...t, bg: e.target.value }))}
                    className="w-9 h-9 rounded-lg cursor-pointer border-0 p-0.5 bg-panel-2"
                  />
                  <span className="text-xs text-txt-faint font-mono">{theme.bg ?? DEFAULT_THEME.bg}</span>
                </div>
              </div>
              <div>
                <label className="field-label">Accent</label>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="color"
                    value={theme.accent ?? DEFAULT_THEME.accent}
                    onChange={(e) => setTheme((t) => ({ ...t, accent: e.target.value }))}
                    className="w-9 h-9 rounded-lg cursor-pointer border-0 p-0.5 bg-panel-2"
                  />
                  <span className="text-xs text-txt-faint font-mono">{theme.accent ?? DEFAULT_THEME.accent}</span>
                </div>
              </div>
              <div>
                <label className="field-label">Text</label>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="color"
                    value={theme.textColor ?? DEFAULT_THEME.textColor}
                    onChange={(e) => setTheme((t) => ({ ...t, textColor: e.target.value }))}
                    className="w-9 h-9 rounded-lg cursor-pointer border-0 p-0.5 bg-panel-2"
                  />
                  <span className="text-xs text-txt-faint font-mono">{theme.textColor ?? DEFAULT_THEME.textColor}</span>
                </div>
              </div>
            </div>

            {/* Quick preset themes */}
            <div>
              <p className="field-label mb-2">Quick Presets</p>
              <div className="flex gap-2 flex-wrap">
                {[
                  { label: "Dark Gold", bg: "#0f1219", accent: "#d9a441", textColor: "#ffffff" },
                  { label: "Night Blue", bg: "#0a0f1e", accent: "#5b8def", textColor: "#ffffff" },
                  { label: "Emerald", bg: "#0a1f14", accent: "#3ec78d", textColor: "#ffffff" },
                  { label: "Pure White", bg: "#ffffff", accent: "#d9a441", textColor: "#0f1219" },
                  { label: "Slate", bg: "#1e2639", accent: "#f0c14b", textColor: "#e8edf6" },
                ].map((p) => (
                  <button
                    key={p.label}
                    onClick={() => setTheme(p)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-line hover:border-gold-bright/40 transition-all text-xs font-medium"
                    style={{ background: p.bg, color: p.textColor }}
                  >
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ background: p.accent }}
                    />
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </Card>

          {/* Blocks */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-semibold text-base flex items-center gap-2">
                <Icon name="LayoutList" size={16} className="text-gold-bright" />
                Blocks
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={() => handleAddBlock("heading")}
                  className="btn btn-ghost text-xs flex items-center gap-1"
                >
                  <Icon name="Heading2" size={13} />
                  Heading
                </button>
                <button
                  onClick={() => handleAddBlock("link")}
                  className="btn btn-primary text-xs flex items-center gap-1"
                >
                  <Icon name="Plus" size={13} />
                  Link
                </button>
              </div>
            </div>

            {blocks.length === 0 ? (
              <EmptyState
                icon="LayoutList"
                title="No blocks yet"
                hint="Add link or heading blocks to build your page."
              />
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={blocks.map((b) => b.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {blocks.map((block) => (
                      <SortableBlock
                        key={block.id}
                        block={block}
                        onEdit={(b) => setEditingBlock(b)}
                        onDelete={handleDeleteBlock}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
            <p className="text-txt-faint text-xs mt-3 flex items-center gap-1">
              <Icon name="GripVertical" size={12} />
              Drag the handle to reorder blocks
            </p>
          </Card>
        </div>

        {/* ── Right: Phone Preview ───────────────────────────────────────── */}
        <div className="hidden lg:flex justify-center items-start pt-4 sticky top-6">
          <PhonePreview
            title={title}
            bio={bio}
            avatarUrl={avatarUrl}
            theme={theme}
            blocks={blocks}
          />
        </div>
      </div>

      {/* Mobile preview toggle area */}
      <div className="lg:hidden mt-6">
        <Card className="p-5">
          <h3 className="font-display font-semibold text-base mb-4 text-center">Preview</h3>
          <div className="flex justify-center">
            <PhonePreview
              title={title}
              bio={bio}
              avatarUrl={avatarUrl}
              theme={theme}
              blocks={blocks}
            />
          </div>
        </Card>
      </div>

      {/* Block Edit Modal */}
      {editingBlock && (
        <BlockEditModal
          block={editingBlock}
          onSave={handleSaveBlock}
          onClose={() => setEditingBlock(null)}
        />
      )}
    </div>
  );
}
