import { NextRequest, NextResponse } from "next/server";
import { currentUser, resolveTenantId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = await resolveTenantId(user);
  if (!tenantId) return NextResponse.json({ error: "No tenant" }, { status: 400 });

  const rows = await prisma.offerLetter.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Only ADMIN/MANAGER can create offer letters
  if (!["ADMIN", "MANAGER", "SUPER_ADMIN"].includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const tenantId = await resolveTenantId(user);
  if (!tenantId) return NextResponse.json({ error: "No tenant" }, { status: 400 });

  const body = await req.json();
  const { candidate, role, ctc } = body as {
    candidate: string;
    role: string;
    ctc: number;
  };

  if (!candidate || !role || ctc == null) {
    return NextResponse.json(
      { error: "candidate, role and ctc are required" },
      { status: 400 }
    );
  }

  const record = await prisma.offerLetter.create({
    data: {
      tenantId,
      candidate,
      role,
      ctc,
      url: `/uploads/offer-${candidate.replace(/\s+/g, "-").toLowerCase()}-${Date.now()}.pdf`,
    },
  });

  await audit({
    tenantId,
    action: "OFFER_LETTER_CREATED",
    entity: "OfferLetter",
    entityId: record.id,
    performedById: user.id,
    meta: { candidate, role, ctc },
  });

  return NextResponse.json(record, { status: 201 });
}
