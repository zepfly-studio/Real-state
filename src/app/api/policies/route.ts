import { NextRequest, NextResponse } from "next/server";
import { requireRole, resolveTenantId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { Role } from "@prisma/client";

const EDIT_ROLES: Role[] = ["SUPER_ADMIN", "ADMIN", "MANAGER"];

export async function POST(req: NextRequest) {
  try {
    const user = await requireRole(EDIT_ROLES);
    const tenantId = await resolveTenantId(user);
    if (!tenantId) {
      return NextResponse.json({ error: "No tenant" }, { status: 400 });
    }

    const body = await req.json();
    const { title, category, body: policyBody } = body;

    if (!title || !category || !policyBody) {
      return NextResponse.json(
        { error: "title, category and body are required" },
        { status: 400 }
      );
    }

    const validCategories = ["HR", "LEAVE", "SALES", "CONDUCT"];
    if (!validCategories.includes(category)) {
      return NextResponse.json({ error: "Invalid category" }, { status: 400 });
    }

    const policy = await prisma.policy.create({
      data: {
        tenantId,
        title: String(title).trim(),
        category,
        body: String(policyBody).trim(),
      },
    });

    await audit({ tenantId, action: "CREATE", entity: "Policy", entityId: policy.id, performedById: user.id, meta: { title, category } });

    return NextResponse.json(policy, { status: 201 });
  } catch (err: any) {
    if (err?.digest?.startsWith("NEXT_REDIRECT")) throw err;
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
}
