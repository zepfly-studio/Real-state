import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentUser, resolveTenantId } from "@/lib/session";
import { audit } from "@/lib/audit";

export async function GET(req: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const tenantId = await resolveTenantId(user);
    if (!tenantId) return NextResponse.json({ error: "No tenant" }, { status: 400 });

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const today = searchParams.get("today");

    const where: Record<string, unknown> = { tenantId };
    if (userId) where.userId = userId;
    if (today === "1") {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      where.createdAt = { gte: start, lte: end };
    }

    const calls = await prisma.callLog.findMany({
      where,
      include: { user: { select: { id: true, name: true, avatarColor: true } } },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    return NextResponse.json(
      calls.map((c) => ({ ...c, createdAt: c.createdAt.toISOString() }))
    );
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const tenantId = await resolveTenantId(user);
    if (!tenantId) return NextResponse.json({ error: "No tenant" }, { status: 400 });

    const body = await req.json();
    const { leadName, phone, disposition, durationSec, notes, direction, recordingUrl } = body;

    if (!leadName || !phone || !disposition) {
      return NextResponse.json(
        { error: "Missing required: leadName, phone, disposition" },
        { status: 400 }
      );
    }

    const VALID_DISPOSITIONS = ["CONNECTED", "NO_ANSWER", "BUSY", "CALLBACK", "WRONG_NUMBER"];
    if (!VALID_DISPOSITIONS.includes(disposition)) {
      return NextResponse.json({ error: "Invalid disposition" }, { status: 400 });
    }

    const log = await prisma.callLog.create({
      data: {
        tenantId,
        userId: user.id,
        leadName: String(leadName),
        phone: String(phone),
        direction: direction || "OUTBOUND",
        disposition: String(disposition),
        durationSec: durationSec ? Number(durationSec) : 0,
        notes: notes ? String(notes) : null,
        recordingUrl: recordingUrl ? String(recordingUrl) : null,
      },
    });

    await audit({
      tenantId,
      action: "CREATE",
      entity: "CallLog",
      entityId: log.id,
      performedById: user.id,
      meta: { leadName, phone, disposition },
    });

    return NextResponse.json({ ...log, createdAt: log.createdAt.toISOString() }, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
