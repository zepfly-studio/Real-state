import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentUser, resolveTenantId } from "@/lib/session";

export async function GET(req: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const tenantId = await resolveTenantId(user);
    if (!tenantId) return NextResponse.json({ error: "No tenant" }, { status: 400 });

    const leads = await prisma.lead.findMany({
      where: { tenantId },
      include: { assignedTo: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    });

    const header = [
      "name",
      "phone",
      "email",
      "propertyType",
      "location",
      "source",
      "temperature",
      "stage",
      "value",
      "assignedTo",
      "notes",
      "nextFollowUp",
      "createdAt",
    ].join(",");

    function esc(v: string | null | undefined): string {
      if (v == null) return "";
      const s = String(v).replace(/"/g, '""');
      return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s}"` : s;
    }

    const rows = leads.map((l) =>
      [
        esc(l.name),
        esc(l.phone),
        esc(l.email),
        esc(l.propertyType),
        esc(l.location),
        esc(l.source),
        esc(l.temperature),
        esc(l.stage),
        esc(String(Number(l.value))),
        esc(l.assignedTo?.name),
        esc(l.notes),
        esc(l.nextFollowUp?.toISOString() ?? ""),
        esc(l.createdAt.toISOString()),
      ].join(",")
    );

    const csv = [header, ...rows].join("\n");

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="leads-export-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
