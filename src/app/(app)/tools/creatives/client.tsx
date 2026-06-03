"use client";

import { useState, useRef, useCallback } from "react";
import { Card, ConnectBanner, PageHeader } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { JAIPUR_AREAS } from "@/lib/format";

// ── Types ─────────────────────────────────────────────────────────────────────

type PostType = "PROPERTY_AD" | "FESTIVE_GREETING" | "PRICE_DROP" | "OPEN_HOUSE";
type Tone = "professional" | "casual" | "luxury" | "urgent";

interface FormState {
  postType: PostType;
  projectName: string;
  price: string;
  location: string;
  festival: string;
  tone: Tone;
}

interface GeneratedCopy {
  headline: string;
  body: string;
  hashtags: string[];
  cta: string;
  mode: "builtin" | "ai";
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const POST_TYPE_LABELS: Record<PostType, string> = {
  PROPERTY_AD: "Property Ad",
  FESTIVE_GREETING: "Festive Greeting",
  PRICE_DROP: "Price Drop",
  OPEN_HOUSE: "Open House",
};

const POST_TYPE_ICONS: Record<PostType, string> = {
  PROPERTY_AD: "Building2",
  FESTIVE_GREETING: "Sparkles",
  PRICE_DROP: "TrendingDown",
  OPEN_HOUSE: "DoorOpen",
};

const FESTIVALS = [
  "Diwali",
  "Holi",
  "Navratri",
  "Dussehra",
  "Eid",
  "Christmas",
  "New Year",
  "Raksha Bandhan",
  "Ganesh Chaturthi",
  "Republic Day",
  "Independence Day",
];

const TONES: { value: Tone; label: string }[] = [
  { value: "professional", label: "Professional" },
  { value: "casual", label: "Casual & Friendly" },
  { value: "luxury", label: "Luxury" },
  { value: "urgent", label: "Urgent" },
];

// ── Visual Card Preview ───────────────────────────────────────────────────────

function SocialCardPreview({
  copy,
  form,
  brandColor,
  brandName,
}: {
  copy: GeneratedCopy | null;
  form: FormState;
  brandColor: string;
  brandName: string;
}) {
  const isFestive = form.postType === "FESTIVE_GREETING";
  const isPriceDrop = form.postType === "PRICE_DROP";

  // Festive gradient overlay patterns
  const festivePatterns: Record<string, string> = {
    Diwali: "radial-gradient(ellipse at top, rgba(255,200,50,0.35), transparent 60%)",
    Holi: "radial-gradient(ellipse at center, rgba(255,100,180,0.25), rgba(100,200,255,0.2), transparent 70%)",
    Navratri: "radial-gradient(ellipse at top, rgba(255,120,20,0.3), transparent 60%)",
    Christmas: "radial-gradient(ellipse at top, rgba(20,180,60,0.25), transparent 60%)",
    "New Year": "radial-gradient(ellipse at top, rgba(150,100,255,0.3), transparent 60%)",
  };
  const festiveOverlay = isFestive
    ? festivePatterns[form.festival] || festivePatterns.Diwali
    : undefined;

  // Accent colour from brand, slightly lighter for gradient
  const lighterBrand = brandColor + "33"; // 20% opacity

  const logoInitials = brandName
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div
      className="relative overflow-hidden flex flex-col"
      style={{
        width: "100%",
        aspectRatio: "1 / 1",
        background: `linear-gradient(145deg, #0b0e14 0%, #141a26 100%)`,
        border: `2px solid ${brandColor}33`,
        borderRadius: "20px",
      }}
    >
      {/* Brand accent strip at top */}
      <div
        style={{
          height: "5px",
          background: `linear-gradient(90deg, ${brandColor}, ${brandColor}88, transparent)`,
        }}
      />

      {/* Festive / accent overlay */}
      {festiveOverlay && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: festiveOverlay }}
        />
      )}

      {/* Content */}
      <div className="flex-1 flex flex-col p-6 gap-3 relative z-10">
        {/* Header: brand logo + name */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-[13px] font-bold text-[#1a1205]"
              style={{ background: `linear-gradient(135deg, ${brandColor}, ${brandColor}bb)` }}
            >
              {logoInitials}
            </div>
            <div>
              <div
                className="text-[12px] font-bold leading-none"
                style={{ color: brandColor }}
              >
                {brandName}
              </div>
              <div className="text-[10px] text-txt-faint leading-none mt-0.5">
                Real Estate · Jaipur
              </div>
            </div>
          </div>

          {/* Post type badge */}
          <div
            className="text-[10px] font-bold px-2.5 py-1 rounded-full"
            style={{
              background: lighterBrand,
              color: brandColor,
              border: `1px solid ${brandColor}44`,
            }}
          >
            {POST_TYPE_LABELS[form.postType]}
          </div>
        </div>

        {/* Decorative divider */}
        <div
          style={{
            height: "1px",
            background: `linear-gradient(90deg, ${brandColor}44, transparent)`,
          }}
        />

        {/* Headline */}
        <div
          className="font-display text-[18px] font-bold leading-tight flex-shrink-0"
          style={{ color: isFestive ? "#f0c14b" : "var(--txt)" }}
        >
          {copy?.headline || (
            <span className="text-txt-faint">
              Your headline will appear here…
            </span>
          )}
        </div>

        {/* Price & location row */}
        {(form.price || form.location) && (
          <div className="flex flex-wrap items-center gap-3 flex-shrink-0">
            {form.price && (
              <div
                className="flex items-center gap-1.5 text-[13px] font-bold px-2.5 py-1 rounded-lg"
                style={{
                  background: isPriceDrop ? "rgba(240,85,106,0.15)" : `${brandColor}15`,
                  color: isPriceDrop ? "#f0556a" : brandColor,
                }}
              >
                <Icon name="IndianRupee" size={12} />
                {form.price}
              </div>
            )}
            {form.location && (
              <div className="flex items-center gap-1 text-[12px] text-txt-dim">
                <Icon name="MapPin" size={12} />
                {form.location}
              </div>
            )}
          </div>
        )}

        {/* Body copy (truncated for card) */}
        <div className="text-[12px] text-txt-dim leading-relaxed line-clamp-4 flex-1">
          {copy?.body ? (
            copy.body.split("\n").slice(0, 4).join(" ").replace(/✅|📍|💰|🗓️/g, "")
          ) : (
            <span className="skeleton rounded h-3 block w-full mb-1.5" />
          )}
        </div>

        {/* CTA */}
        {copy?.cta && (
          <div
            className="mt-auto text-[12px] font-semibold px-3 py-2 rounded-lg text-center"
            style={{
              background: `linear-gradient(135deg, ${brandColor}, ${brandColor}cc)`,
              color: "#1a1205",
            }}
          >
            {copy.cta.length > 60 ? copy.cta.slice(0, 57) + "…" : copy.cta}
          </div>
        )}

        {/* Hashtags preview */}
        {copy?.hashtags?.length && (
          <div
            className="text-[10px] leading-snug truncate"
            style={{ color: `${brandColor}99` }}
          >
            {copy.hashtags.slice(0, 5).join(" ")}
          </div>
        )}
      </div>

      {/* Bottom border accent */}
      <div
        style={{
          height: "3px",
          background: `linear-gradient(90deg, transparent, ${brandColor}88, ${brandColor})`,
        }}
      />
    </div>
  );
}

// ── Main Client Component ─────────────────────────────────────────────────────

export function CreativesClient({
  brandColor,
  brandName,
}: {
  brandColor: string;
  brandName: string;
}) {
  const [form, setForm] = useState<FormState>({
    postType: "PROPERTY_AD",
    projectName: "",
    price: "",
    location: JAIPUR_AREAS[0],
    festival: FESTIVALS[0],
    tone: "professional",
  });
  const [copy, setCopy] = useState<GeneratedCopy | null>(null);
  const [loading, setLoading] = useState(false);
  const [copyMode, setCopyMode] = useState<"builtin" | "ai" | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const svgRef = useRef<HTMLDivElement>(null);

  const set = <K extends keyof FormState>(key: K, val: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: val }));
  };

  const generate = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/creatives", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      const data: GeneratedCopy = await res.json();
      setCopy(data);
      setCopyMode(data.mode ?? "builtin");
    } catch {
      setCopy({
        headline: "Discover Your Dream Home in Jaipur",
        body: "Premium properties starting at unbeatable prices. Connect with us today.",
        hashtags: ["#JaipurProperty", "#DreamHome"],
        cta: "Call us today!",
        mode: "builtin",
      });
      setCopyMode("builtin");
    } finally {
      setLoading(false);
    }
  }, [form]);

  const copyCaption = useCallback(() => {
    if (!copy) return;
    const text = `${copy.headline}\n\n${copy.body}\n\n${copy.cta}\n\n${copy.hashtags.join(" ")}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    });
  }, [copy]);

  const downloadSVG = useCallback(() => {
    if (!copy) return;

    const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080" viewBox="0 0 1080 1080">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0b0e14"/>
      <stop offset="100%" style="stop-color:#141a26"/>
    </linearGradient>
    <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:${brandColor}"/>
      <stop offset="100%" style="stop-color:${brandColor}88"/>
    </linearGradient>
    <linearGradient id="cta-bg" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:${brandColor}"/>
      <stop offset="100%" style="stop-color:${brandColor}cc"/>
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="1080" height="1080" fill="url(#bg)" rx="20"/>

  <!-- Top accent bar -->
  <rect x="0" y="0" width="1080" height="8" fill="url(#accent)" rx="4"/>

  <!-- Brand logo circle -->
  <circle cx="80" cy="100" r="38" fill="${brandColor}"/>
  <text x="80" y="108" text-anchor="middle" font-family="system-ui" font-size="22" font-weight="700" fill="#1a1205">
    ${brandName.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
  </text>

  <!-- Brand name -->
  <text x="130" y="96" font-family="system-ui" font-size="22" font-weight="700" fill="${brandColor}">${brandName}</text>
  <text x="130" y="118" font-family="system-ui" font-size="16" fill="#5a6477">Real Estate · Jaipur</text>

  <!-- Post type badge -->
  <rect x="830" y="72" width="200" height="36" rx="18" fill="${brandColor}22"/>
  <text x="930" y="95" text-anchor="middle" font-family="system-ui" font-size="15" font-weight="700" fill="${brandColor}">${POST_TYPE_LABELS[form.postType]}</text>

  <!-- Divider -->
  <line x1="60" y1="160" x2="600" y2="160" stroke="${brandColor}44" stroke-width="1"/>

  <!-- Headline -->
  <foreignObject x="60" y="180" width="960" height="200">
    <div xmlns="http://www.w3.org/1999/xhtml" style="font-family:system-ui;font-size:52px;font-weight:700;color:#e8edf6;line-height:1.2;word-wrap:break-word;">
      ${copy.headline}
    </div>
  </foreignObject>

  <!-- Price tag -->
  ${form.price ? `<rect x="60" y="400" width="220" height="52" rx="10" fill="${brandColor}15"/>
  <text x="80" y="432" font-family="system-ui" font-size="26" font-weight="700" fill="${brandColor}">${form.price}</text>` : ""}

  <!-- Location -->
  ${form.location ? `<text x="300" y="432" font-family="system-ui" font-size="22" fill="#8a96ad">📍 ${form.location}</text>` : ""}

  <!-- Body text -->
  <foreignObject x="60" y="475" width="960" height="300">
    <div xmlns="http://www.w3.org/1999/xhtml" style="font-family:system-ui;font-size:28px;color:#8a96ad;line-height:1.5;word-wrap:break-word;">
      ${copy.body.replace(/\n/g, "<br/>").replace(/✅/g, "✓").replace(/📍|💰|🗓️|⚡|🎯|🏡|🏗️/g, "")}
    </div>
  </foreignObject>

  <!-- CTA button -->
  <rect x="60" y="870" width="960" height="72" rx="14" fill="url(#cta-bg)"/>
  <text x="540" y="913" text-anchor="middle" font-family="system-ui" font-size="28" font-weight="700" fill="#1a1205">${copy.cta.length > 70 ? copy.cta.slice(0, 67) + "…" : copy.cta}</text>

  <!-- Hashtags -->
  <text x="60" y="990" font-family="system-ui" font-size="20" fill="${brandColor}88">${copy.hashtags.slice(0, 6).join(" ")}</text>

  <!-- Bottom accent -->
  <rect x="0" y="1072" width="1080" height="8" fill="${brandColor}66" rx="4"/>
</svg>`;

    const blob = new Blob([svgContent], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${form.projectName || "creative"}-${form.postType.toLowerCase()}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  }, [copy, form, brandColor, brandName]);

  return (
    <div>
      <PageHeader
        title="Creatives Generator"
        subtitle="AI-powered property ads, festive posts & social cards"
        icon="Palette"
        actions={
          copyMode === "ai" ? (
            <span className="tag bg-[rgba(62,199,141,.14)] text-green">Claude-powered</span>
          ) : copyMode === "builtin" ? (
            <span className="tag bg-gold-soft text-gold-bright">Built-in</span>
          ) : null
        }
      />

      {copyMode === "builtin" && (
        <ConnectBanner
          name="Anthropic (Claude)"
          enables="Connect for uniquely-worded AI copy. The built-in generator creates quality ads now."
        />
      )}

      <div className="grid lg:grid-cols-2 gap-5">
        {/* ── Left: Form ── */}
        <Card className="p-5 space-y-5">
          <h3 className="font-display font-bold text-lg flex items-center gap-2">
            <Icon name="Wand2" size={18} className="text-gold-bright" />
            Configure Your Creative
          </h3>

          {/* Post type */}
          <div>
            <label className="field-label">Post Type</label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(POST_TYPE_LABELS) as PostType[]).map((pt) => (
                <button
                  key={pt}
                  onClick={() => set("postType", pt)}
                  className={`btn text-sm py-2.5 justify-start gap-2 ${
                    form.postType === pt
                      ? "border-gold text-gold-bright bg-gold-soft"
                      : ""
                  }`}
                >
                  <Icon name={POST_TYPE_ICONS[pt]} size={15} />
                  {POST_TYPE_LABELS[pt]}
                </button>
              ))}
            </div>
          </div>

          {/* Project name */}
          <div>
            <label className="field-label">Project / Property Name</label>
            <input
              type="text"
              className="input"
              placeholder="e.g. Shubh Residency Phase 2"
              value={form.projectName}
              onChange={(e) => set("projectName", e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Price */}
            <div>
              <label className="field-label">Starting Price</label>
              <input
                type="text"
                className="input"
                placeholder="e.g. ₹45L"
                value={form.price}
                onChange={(e) => set("price", e.target.value)}
              />
            </div>

            {/* Location */}
            <div>
              <label className="field-label">Location</label>
              <select
                className="input"
                value={form.location}
                onChange={(e) => set("location", e.target.value)}
              >
                {JAIPUR_AREAS.map((area) => (
                  <option key={area} value={area}>
                    {area}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Festival selector (only for festive) */}
          {form.postType === "FESTIVE_GREETING" && (
            <div>
              <label className="field-label">Festival</label>
              <select
                className="input"
                value={form.festival}
                onChange={(e) => set("festival", e.target.value)}
              >
                {FESTIVALS.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Tone */}
          <div>
            <label className="field-label">Tone</label>
            <div className="flex flex-wrap gap-2">
              {TONES.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => set("tone", value)}
                  className={`btn btn-ghost text-xs py-1.5 px-3 ${
                    form.tone === value
                      ? "border-gold text-gold-bright bg-gold-soft"
                      : ""
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Generate button */}
          <button
            onClick={generate}
            disabled={loading}
            className="btn btn-primary w-full py-3 text-base justify-center"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-[#1a1205] border-t-transparent rounded-full animate-spin" />
                Generating…
              </>
            ) : (
              <>
                <Icon name="Sparkles" size={17} />
                Generate Creative
              </>
            )}
          </button>

          {/* Note about Anthropic */}
          {copyMode === "builtin" && (
            <p className="text-[11px] text-txt-faint text-center">
              Connect Anthropic in Settings for richer, AI-crafted copy.
            </p>
          )}
        </Card>

        {/* ── Right: Preview + Generated Copy ── */}
        <div className="space-y-5">
          {/* Social card preview */}
          <div ref={svgRef}>
            <SocialCardPreview
              copy={copy}
              form={form}
              brandColor={brandColor}
              brandName={brandName}
            />
          </div>

          {/* Action buttons */}
          {copy && (
            <div className="flex gap-3">
              <button
                onClick={copyCaption}
                className="btn flex-1 justify-center gap-2"
              >
                <Icon name={copySuccess ? "Check" : "Copy"} size={15} />
                {copySuccess ? "Copied!" : "Copy Caption"}
              </button>
              <button
                onClick={downloadSVG}
                className="btn btn-primary flex-1 justify-center gap-2"
              >
                <Icon name="Download" size={15} />
                Download SVG
              </button>
            </div>
          )}

          {/* Generated copy breakdown */}
          {copy && (
            <Card className="p-5 space-y-4">
              <h4 className="font-display font-semibold flex items-center gap-2">
                <Icon name="FileText" size={16} className="text-gold-bright" />
                Generated Copy
              </h4>

              <div>
                <div className="section-label mb-1.5">Headline</div>
                <p className="text-sm font-semibold leading-snug">{copy.headline}</p>
              </div>

              <div>
                <div className="section-label mb-1.5">Body</div>
                <p className="text-sm text-txt-dim leading-relaxed whitespace-pre-line">
                  {copy.body}
                </p>
              </div>

              <div>
                <div className="section-label mb-1.5">Call to Action</div>
                <p className="text-sm font-semibold text-gold-bright">{copy.cta}</p>
              </div>

              <div>
                <div className="section-label mb-2">Hashtags</div>
                <div className="flex flex-wrap gap-1.5">
                  {copy.hashtags.map((tag) => (
                    <span
                      key={tag}
                      className="tag bg-gold-soft text-gold-bright cursor-pointer hover:bg-[rgba(217,164,65,0.2)] transition-colors"
                      onClick={() => {
                        navigator.clipboard.writeText(tag);
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
