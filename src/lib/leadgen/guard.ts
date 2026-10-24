import { NextResponse } from "next/server";
import type { Role } from "@prisma/client";
import { currentUser, resolveTenantId } from "@/lib/session";
import { canViewModule } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/lib/auth";

/**
 * Auth for every /api/leadgen/* route that a signed-in person calls.
 *   - must be signed in and belong to a tenant,
 *   - the tenant's permission matrix must allow the "leadgen" module for their role,
 *   - `manage: true` additionally requires an owner role (connect tools, change keys).
 * Every query that follows MUST be scoped by the returned tenantId.
 */
export interface LgCtx {
  user: SessionUser;
  tenantId: string;
}

const OWNER: Role[] = ["SUPER_ADMIN", "ADMIN"];

export async function lgContext(opts: { manage?: boolean } = {}): Promise<LgCtx | NextResponse> {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  const tenantId = await resolveTenantId(user);
  if (!tenantId) return NextResponse.json({ error: "No workspace found for this account." }, { status: 400 });

  if (opts.manage && !OWNER.includes(user.role)) {
    return NextResponse.json({ error: "Only an admin can change this." }, { status: 403 });
  }
  if (!(await canViewModule(user.role, tenantId, "leadgen"))) {
    return NextResponse.json({ error: "You don't have access to Lead Generation." }, { status: 403 });
  }
  return { user, tenantId };
}

export function isResponse(x: LgCtx | NextResponse): x is NextResponse {
  return x instanceof NextResponse;
}

/**
 * Auth for the n8n → CRM endpoints. n8n sends the tenant's secret in
 * `X-Leadgen-Token`; the token identifies the tenant, so n8n never needs a tenant id.
 */
export async function lgTokenTenant(req: Request): Promise<string | null> {
  const token = (req.headers.get("x-leadgen-token") ?? "").trim();
  if (token.length < 16) return null;
  const row = await prisma.integration.findFirst({
    where: { name: "LEADGEN_TOKEN", value: token, isActive: true },
    select: { tenantId: true },
  });
  return row?.tenantId ?? null;
}

/** For server-rendered pages: sign-in + tenant + the tenant's permission for one module key, else redirect. */
export async function requireModule(key: string): Promise<LgCtx> {
  const { redirect } = await import("next/navigation");
  const { requireUser } = await import("@/lib/session");
  const user = await requireUser();
  const tenantId = await resolveTenantId(user);
  if (!tenantId || !(await canViewModule(user.role, tenantId, key))) redirect("/dashboard");
  return { user, tenantId: tenantId as string };
}
