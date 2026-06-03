import { prisma } from "@/lib/prisma";
import type { Metadata } from "next";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Block {
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

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const page = await prisma.linkPage.findUnique({ where: { slug: params.slug } });
  if (!page || !page.published) {
    return { title: "Page not found" };
  }
  return {
    title: page.title,
    description: page.bio ?? undefined,
    openGraph: {
      title: page.title,
      description: page.bio ?? undefined,
      images: page.avatarUrl ? [page.avatarUrl] : [],
    },
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function PublicLinkPage({
  params,
}: {
  params: { slug: string };
}) {
  const page = await prisma.linkPage.findUnique({ where: { slug: params.slug } });

  // Not found or unpublished state
  if (!page || !page.published) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#0f1219",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          color: "#e8edf6",
          padding: "2rem",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: "50%",
            background: "rgba(217,164,65,0.12)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "1.5rem",
            fontSize: "1.75rem",
          }}
        >
          🏠
        </div>
        <h1
          style={{
            fontSize: "1.5rem",
            fontWeight: 700,
            marginBottom: "0.75rem",
          }}
        >
          Page Not Found
        </h1>
        <p style={{ color: "#7a8499", fontSize: "0.95rem", maxWidth: 340 }}>
          This link page doesn&apos;t exist or hasn&apos;t been published yet. Contact the team for the correct link.
        </p>
      </div>
    );
  }

  // Optionally increment view count (fire-and-forget, never throws)
  prisma.linkPage
    .update({ where: { id: page.id }, data: { views: { increment: 1 } } })
    .catch(() => {});

  const theme = (page.theme ?? {}) as unknown as Theme;
  const blocks = (page.blocks ?? []) as unknown as Block[];

  const bg = theme.bg || "#0f1219";
  const accent = theme.accent || "#d9a441";
  const textColor = theme.textColor || "#ffffff";

  // Determine contrast color for buttons (light text on dark accent, dark on light)
  function isLight(hex: string) {
    const c = hex.replace("#", "");
    const r = parseInt(c.substring(0, 2), 16);
    const g = parseInt(c.substring(2, 4), 16);
    const b = parseInt(c.substring(4, 6), 16);
    return (r * 299 + g * 587 + b * 114) / 1000 > 128;
  }
  const btnTextColor = isLight(accent) ? "#0f1219" : "#ffffff";

  return (
    <div
      style={{
        minHeight: "100vh",
        background: bg,
        color: textColor,
        fontFamily: "'Sora', 'Space Grotesk', system-ui, sans-serif",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "2rem 1rem 4rem",
      }}
    >
      <style>{`.linkbtn:hover{opacity:.88;transform:translateY(-1px);}`}</style>
      <div style={{ width: "100%", maxWidth: 480 }}>
        {/* Avatar */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "1.5rem" }}>
          {page.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={page.avatarUrl}
              alt={page.title}
              style={{
                width: 80,
                height: 80,
                borderRadius: "50%",
                objectFit: "cover",
                border: `3px solid ${accent}`,
                marginBottom: "1rem",
              }}
            />
          ) : (
            <div
              style={{
                width: 80,
                height: 80,
                borderRadius: "50%",
                background: accent,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "2rem",
                fontWeight: 700,
                color: btnTextColor,
                marginBottom: "1rem",
                border: `3px solid ${accent}`,
              }}
            >
              {page.title[0]?.toUpperCase() ?? "S"}
            </div>
          )}

          {/* Title */}
          <h1
            style={{
              fontSize: "1.5rem",
              fontWeight: 800,
              textAlign: "center",
              marginBottom: "0.4rem",
              color: textColor,
              lineHeight: 1.2,
            }}
          >
            {page.title}
          </h1>

          {/* Bio */}
          {page.bio && (
            <p
              style={{
                textAlign: "center",
                fontSize: "0.9rem",
                color: textColor,
                opacity: 0.7,
                lineHeight: 1.6,
                maxWidth: 380,
                margin: 0,
              }}
            >
              {page.bio}
            </p>
          )}
        </div>

        {/* Blocks */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
          {blocks.map((block) => {
            if (block.type === "heading") {
              return (
                <div
                  key={block.id}
                  style={{
                    textAlign: "center",
                    padding: "0.75rem 0 0.25rem",
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.7rem",
                      textTransform: "uppercase",
                      letterSpacing: "0.12em",
                      fontWeight: 600,
                      color: textColor,
                      opacity: 0.5,
                    }}
                  >
                    {block.label}
                  </span>
                </div>
              );
            }

            // Link block
            const href = block.url || "#";
            return (
              <a
                key={block.id}
                href={href}
                target={href.startsWith("http") ? "_blank" : "_self"}
                rel="noreferrer"
                className="linkbtn"
                style={{
                  display: "block",
                  background: accent,
                  color: btnTextColor,
                  borderRadius: 14,
                  padding: "1rem 1.25rem",
                  textAlign: "center",
                  fontWeight: 700,
                  fontSize: "0.95rem",
                  textDecoration: "none",
                  boxShadow: `0 4px 20px ${accent}40`,
                  transition: "opacity 0.15s, transform 0.15s",
                  lineHeight: 1.3,
                }}
              >
                {block.label}
              </a>
            );
          })}
        </div>

        {/* Footer */}
        <div
          style={{
            marginTop: "2.5rem",
            textAlign: "center",
            fontSize: "0.75rem",
            color: textColor,
            opacity: 0.3,
          }}
        >
          Powered by Real Estate OS
        </div>
      </div>
    </div>
  );
}
