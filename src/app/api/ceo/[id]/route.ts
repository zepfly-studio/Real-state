import { NextRequest, NextResponse } from "next/server";
import { requireRole, resolveTenantId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireRole(["SUPER_ADMIN", "ADMIN"]);
    const tenantId = await resolveTenantId(user);
    if (!tenantId) {
      return NextResponse.json({ error: "No tenant" }, { status: 400 });
    }

    const { id } = params;

    const note = await prisma.ceoNote.findFirst({
      where: { id, tenantId },
    });

    if (!note) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.ceoNote.delete({ where: { id } });

    await audit({ tenantId, action: "DELETE", entity: "CeoNote", entityId: id, performedById: user.id, meta: { title: note.title, category: note.category } });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    if (err?.digest?.startsWith("NEXT_REDIRECT")) throw err;
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
}
