import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions, type SessionUser } from "./auth";
import { prisma } from "./prisma";
import { Role } from "@prisma/client";

/** Returns the current session user or null (server components / route handlers). */
export async function currentUser(): Promise<SessionUser | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  return session.user as unknown as SessionUser;
}

/** Require a logged-in user; redirect to /login otherwise. */
export async function requireUser(): Promise<SessionUser> {
  const user = await currentUser();
  if (!user) redirect("/login");
  return user;
}

/** Require one of the given roles; redirect to /dashboard if not allowed. */
export async function requireRole(roles: Role[]): Promise<SessionUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) redirect("/dashboard");
  return user;
}

/**
 * Returns the tenantId to scope queries by. SUPER_ADMIN has none of their own;
 * for demo seeding they get the demo tenant so cross-tenant pages still render.
 */
export async function resolveTenantId(user: SessionUser): Promise<string | null> {
  if (user.tenantId) return user.tenantId;
  if (user.role === "SUPER_ADMIN") {
    const t = await prisma.tenant.findFirst({ orderBy: { createdAt: "asc" } });
    return t?.id ?? null;
  }
  return null;
}
