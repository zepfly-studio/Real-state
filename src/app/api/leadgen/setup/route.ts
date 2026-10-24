import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { getIntegration, maskKey } from "@/lib/integrations";
import { lgContext, isResponse } from "@/lib/leadgen/guard";
import { guarded } from "@/lib/leadgen/respond";
import { SETUP_FIELDS } from "@/lib/leadgen/setup-fields";

/** GET — what's connected (secrets masked) plus the values n8n needs. Owners only. */
export async function GET(req: Request) {
  const ctx = await lgContext({ manage: true });
  if (isResponse(ctx)) return ctx;
  return guarded(async () => {
    const fields = await Promise.all(
      SETUP_FIELDS.map(async (f) => {
        const v = await getIntegration(ctx.tenantId, f.name);
        return { ...f, configured: Boolean(v), value: f.secret ? "" : v ?? "", preview: f.secret ? maskKey(v) : "" };
      })
    );
    const token = await getIntegration(ctx.tenantId, "LEADGEN_TOKEN");
    const origin = process.env.NEXTAUTH_URL?.replace(/\/+$/, "") || new URL(req.url).origin;
    return {
      fields,
      token: token ?? null,
      urls: { sync: `${origin}/api/leadgen/sync`, leads: `${origin}/api/leadgen/n8n/leads`, crm: origin },
    };
  });
}

/** POST — create the workspace token n8n uses to talk to this CRM (or rotate it). */
export async function POST() {
  const ctx = await lgContext({ manage: true });
  if (isResponse(ctx)) return ctx;
  return guarded(async () => {
    const token = `lg_${randomBytes(24).toString("hex")}`;
    await prisma.integration.upsert({
      where: { tenantId_name: { tenantId: ctx.tenantId, name: "LEADGEN_TOKEN" } },
      update: { value: token, isActive: true },
      create: { tenantId: ctx.tenantId, name: "LEADGEN_TOKEN", value: token, isActive: true },
    });
    await audit({ tenantId: ctx.tenantId, action: "LEADGEN_TOKEN_ROTATED", entity: "Integration", entityId: "LEADGEN_TOKEN", performedById: ctx.user.id });
    return NextResponse.json({ token });
  });
}
