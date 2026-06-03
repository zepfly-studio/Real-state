import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentUser, resolveTenantId } from "@/lib/session";
import { audit } from "@/lib/audit";

/**
 * GET /api/link-pages
 * Returns the tenant's LinkPage (first one).
 */
export async function GET(req: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const tenantId = await resolveTenantId(user);
    if (!tenantId) return NextResponse.json({ error: "No tenant" }, { status: 400 });

    const page = await prisma.linkPage.findFirst({
      where: { tenantId },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json(page ?? null);
  } catch (err) {
    console.error("[link-pages GET]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/**
 * PATCH /api/link-pages (also accepts POST for upsert)
 * Body: { slug, title, bio?, avatarUrl?, theme?, blocks?, published? }
 * Upserts the tenant's LinkPage by slug. Enforces slug uniqueness across tenants.
 */
export async function PATCH(req: NextRequest) {
  return upsertLinkPage(req);
}

export async function POST(req: NextRequest) {
  return upsertLinkPage(req);
}

async function upsertLinkPage(req: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const tenantId = await resolveTenantId(user);
    if (!tenantId) return NextResponse.json({ error: "No tenant" }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const { slug, title, bio, avatarUrl, theme, blocks, published } = body as {
      slug?: string;
      title?: string;
      bio?: string;
      avatarUrl?: string;
      theme?: Record<string, string>;
      blocks?: unknown[];
      published?: boolean;
    };

    if (!title?.trim()) {
      return NextResponse.json({ error: "title is required" }, { status: 400 });
    }

    // Derive/clean slug
    const rawSlug = slug?.trim() || title.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const cleanSlug = rawSlug || "my-page";

    // Find existing page for this tenant
    const existing = await prisma.linkPage.findFirst({
      where: { tenantId },
      orderBy: { createdAt: "asc" },
    });

    // Check slug uniqueness — must not be used by another tenant's page
    if (!existing || existing.slug !== cleanSlug) {
      const conflict = await prisma.linkPage.findFirst({
        where: { slug: cleanSlug, tenantId: { not: tenantId } },
      });
      if (conflict) {
        // Auto-suffix to make unique
        const uniqueSlug = `${cleanSlug}-${tenantId.slice(-6)}`;
        return upsertWithSlug(tenantId, user.id, existing, uniqueSlug, title, bio, avatarUrl, theme, blocks, published);
      }
    }

    return upsertWithSlug(tenantId, user.id, existing, cleanSlug, title, bio, avatarUrl, theme, blocks, published);
  } catch (err) {
    console.error("[link-pages PATCH]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

async function upsertWithSlug(
  tenantId: string,
  userId: string,
  existing: { id: string } | null,
  cleanSlug: string,
  title: string,
  bio?: string,
  avatarUrl?: string,
  theme?: Record<string, string>,
  blocks?: unknown[],
  published?: boolean
) {
  const data = {
    tenantId,
    slug: cleanSlug,
    title: title.trim(),
    bio: bio ?? null,
    avatarUrl: avatarUrl ?? null,
    theme: (theme ?? {}) as any,
    blocks: (blocks ?? []) as any,
    published: published ?? false,
  };

  let page;
  if (existing) {
    page = await prisma.linkPage.update({
      where: { id: existing.id },
      data,
    });
  } else {
    page = await prisma.linkPage.create({ data });
  }

  await audit({
    tenantId,
    action: existing ? "UPDATE" : "CREATE",
    entity: "LinkPage",
    entityId: page.id,
    performedById: userId,
    meta: { slug: cleanSlug, title, published },
  });

  return NextResponse.json(page, { status: existing ? 200 : 201 });
}
