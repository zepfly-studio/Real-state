import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { currentUser, resolveTenantId } from "@/lib/session";
import { audit } from "@/lib/audit";
import { Role } from "@prisma/client";

const AVATAR_PALETTE = [
  "#d9a441",
  "#3ec78d",
  "#5b8def",
  "#9b7ef0",
  "#f0556a",
  "#f06a2b",
  "#2bc4c4",
  "#d94180",
];

export async function POST(req: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "SUPER_ADMIN" && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const tenantId = await resolveTenantId(user);
    if (!tenantId) return NextResponse.json({ error: "No tenant" }, { status: 400 });

    const body = await req.json();
    const { name, email, role, phone } = body;

    if (!name || !email || !role) {
      return NextResponse.json({ error: "name, email and role are required" }, { status: 400 });
    }

    // Never allow creating SUPER_ADMIN via this endpoint
    if (role === "SUPER_ADMIN") {
      return NextResponse.json({ error: "Cannot create SUPER_ADMIN users" }, { status: 400 });
    }

    // Validate role is a valid enum value
    const validRoles: Role[] = ["ADMIN", "MANAGER", "EMPLOYEE", "CLIENT", "CHANNEL_PARTNER"];
    if (!validRoles.includes(role as Role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) return NextResponse.json({ error: "Email already in use" }, { status: 409 });

    const passwordHash = await bcrypt.hash("password123", 10);
    const avatarColor = AVATAR_PALETTE[Math.floor(Math.random() * AVATAR_PALETTE.length)];

    const newUser = await prisma.user.create({
      data: {
        tenantId,
        name: String(name).trim(),
        email: email.toLowerCase().trim(),
        passwordHash,
        role: role as Role,
        phone: phone ? String(phone).trim() : null,
        avatarColor,
        isActive: true,
      },
    });

    await audit({
      tenantId,
      action: "USER_CREATED",
      entity: "User",
      entityId: newUser.id,
      performedById: user.id,
      meta: { name: newUser.name, email: newUser.email, role: newUser.role },
    });

    // Return without passwordHash
    const { passwordHash: _ph, ...safeUser } = newUser;
    return NextResponse.json(safeUser, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
