import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentUser, resolveTenantId } from "@/lib/session";
import { audit } from "@/lib/audit";

function generateQrCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "VIS-";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export async function GET(req: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const tenantId = await resolveTenantId(user);
    if (!tenantId) return NextResponse.json({ error: "No tenant" }, { status: 400 });

    const visitors = await prisma.visitor.findMany({
      where: { tenantId },
      orderBy: { checkIn: "desc" },
    });

    return NextResponse.json(visitors);
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
    const { name, phone, purpose } = body;

    if (!name || !phone || !purpose) {
      return NextResponse.json(
        { error: "name, phone, and purpose are required." },
        { status: 400 }
      );
    }

    const qrCode = generateQrCode();

    const visitor = await prisma.visitor.create({
      data: {
        tenantId,
        name: String(name),
        phone: String(phone),
        purpose: String(purpose),
        qrCode,
        checkIn: new Date(),
      },
    });

    await audit({
      tenantId,
      action: "CREATE",
      entity: "Visitor",
      entityId: visitor.id,
      performedById: user.id,
      meta: { name, phone, qrCode },
    });

    return NextResponse.json(visitor, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
