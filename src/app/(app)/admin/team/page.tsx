import { requireRole, resolveTenantId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import { MODULES } from "@/lib/modules";
import { TeamClient } from "./client";

export default async function TeamPage() {
  const user = await requireRole(["SUPER_ADMIN", "ADMIN"]);
  const tenantId = await resolveTenantId(user);

  if (!tenantId) {
    return (
      <div className="p-6 text-txt-dim">No tenant context found.</div>
    );
  }

  const [users, modulePermissions, auditLogs] = await Promise.all([
    prisma.user.findMany({
      where: { tenantId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatarColor: true,
        phone: true,
        isActive: true,
        lastActiveAt: true,
        createdAt: true,
      },
    }),
    prisma.modulePermission.findMany({
      where: { tenantId },
    }),
    prisma.auditLog.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        performedBy: {
          select: { id: true, name: true, avatarColor: true },
        },
      },
    }),
  ]);

  // Serialize dates to strings for client component
  const serializedUsers = users.map((u) => ({
    ...u,
    lastActiveAt: u.lastActiveAt ? u.lastActiveAt.toISOString() : null,
    createdAt: u.createdAt.toISOString(),
  }));

  const serializedLogs = auditLogs.map((l) => ({
    ...l,
    createdAt: l.createdAt.toISOString(),
    meta: l.meta as Record<string, unknown>,
    performedBy: l.performedBy
      ? {
          id: l.performedBy.id,
          name: l.performedBy.name,
          avatarColor: l.performedBy.avatarColor,
        }
      : null,
  }));

  return (
    <div>
      <PageHeader
        title="Team & Roles"
        subtitle="Manage team members, permissions, and track activity"
        icon="UsersRound"
      />
      <TeamClient
        initialUsers={serializedUsers}
        modulePermissions={modulePermissions}
        auditLogs={serializedLogs}
        modules={MODULES}
        currentUserId={user.id}
      />
    </div>
  );
}
