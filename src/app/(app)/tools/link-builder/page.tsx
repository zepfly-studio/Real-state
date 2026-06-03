import { requireUser, resolveTenantId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { LinkBuilderClient, type Block } from "./client";

export default async function LinkBuilderPage() {
  const user = await requireUser();
  const tenantId = await resolveTenantId(user);

  if (!tenantId) {
    return <div className="text-txt-dim p-8">No tenant context.</div>;
  }

  // Fetch the tenant's LinkPage (there may be one from seed)
  const linkPage = await prisma.linkPage.findFirst({
    where: { tenantId },
    orderBy: { createdAt: "asc" },
  });

  // Serialise for client boundary
  const serialised = linkPage
    ? {
        id: linkPage.id,
        slug: linkPage.slug,
        title: linkPage.title,
        bio: linkPage.bio ?? "",
        avatarUrl: linkPage.avatarUrl ?? "",
        theme: (linkPage.theme ?? {}) as unknown as Record<string, string>,
        blocks: (linkPage.blocks ?? []) as unknown as Block[],
        published: linkPage.published,
        views: linkPage.views,
        createdAt: linkPage.createdAt.toISOString(),
      }
    : null;

  return (
    <LinkBuilderClient
      initialPage={serialised}
      tenantId={tenantId}
    />
  );
}

