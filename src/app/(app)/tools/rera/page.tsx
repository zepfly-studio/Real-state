import { requireRole, resolveTenantId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { ReraClient } from "./client";

export default async function ReraPage() {
  const user = await requireRole(["SUPER_ADMIN", "ADMIN", "MANAGER"]);
  const tenantId = await resolveTenantId(user);

  if (!tenantId) {
    return <div className="text-txt-dim p-6">No tenant context.</div>;
  }

  const projects = await prisma.reraProject.findMany({
    where: { tenantId },
    orderBy: { expiryAt: "asc" },
  });

  // Serialize for client (dates → strings)
  const serialized = projects.map((p) => ({
    id: p.id,
    projectName: p.projectName,
    reraNo: p.reraNo,
    registeredAt: p.registeredAt.toISOString(),
    expiryAt: p.expiryAt.toISOString(),
    docs: p.docs as { name: string; ok: boolean }[],
    deadlines: p.deadlines as { label: string; due: string }[],
    createdAt: p.createdAt.toISOString(),
  }));

  return <ReraClient projects={serialized} tenantId={tenantId} />;
}
