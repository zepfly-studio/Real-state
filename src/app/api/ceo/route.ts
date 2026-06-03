import { NextRequest, NextResponse } from "next/server";
import { requireRole, resolveTenantId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  try {
    const user = await requireRole(["SUPER_ADMIN", "ADMIN"]);
    const tenantId = await resolveTenantId(user);
    if (!tenantId) {
      return NextResponse.json({ error: "No tenant" }, { status: 400 });
    }

    const body = await req.json();
    const { category, title, body: noteBody, amount } = body;

    if (!category || !title) {
      return NextResponse.json(
        { error: "category and title are required" },
        { status: 400 }
      );
    }

    const validCategories = ["OVERVIEW", "INVESTMENT", "BALANCE", "IDEA", "HEALTH", "NOTE"];
    if (!validCategories.includes(category)) {
      return NextResponse.json({ error: "Invalid category" }, { status: 400 });
    }

    const note = await prisma.ceoNote.create({
      data: {
        tenantId,
        userId: user.id,
        category,
        title: String(title).trim(),
        body: noteBody ? String(noteBody).trim() : "",
        amount: amount != null ? amount : undefined,
      },
    });

    await audit({ tenantId, action: "CREATE", entity: "CeoNote", entityId: note.id, performedById: user.id, meta: { category, title } });

    return NextResponse.json(note, { status: 201 });
  } catch (err: any) {
    if (err?.digest?.startsWith("NEXT_REDIRECT")) throw err;
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
}
