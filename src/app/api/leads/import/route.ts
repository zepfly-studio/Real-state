import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentUser, resolveTenantId } from "@/lib/session";
import { audit } from "@/lib/audit";
import { ActivityType, LeadSource, LeadStage, LeadTemperature } from "@prisma/client";

const VALID_SOURCES = Object.values(LeadSource);
const VALID_STAGES = Object.values(LeadStage);
const VALID_TEMPS = Object.values(LeadTemperature);

function coerceSource(v: string): LeadSource {
  const up = v?.toUpperCase().trim();
  return (VALID_SOURCES.includes(up as LeadSource) ? up : "WEBSITE") as LeadSource;
}
function coerceStage(v: string): LeadStage {
  const up = v?.toUpperCase().trim().replace(/ /g, "_");
  return (VALID_STAGES.includes(up as LeadStage) ? up : "NEW") as LeadStage;
}
function coerceTemp(v: string): LeadTemperature {
  const up = v?.toUpperCase().trim();
  return (VALID_TEMPS.includes(up as LeadTemperature) ? up : "WARM") as LeadTemperature;
}

export async function POST(req: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const tenantId = await resolveTenantId(user);
    if (!tenantId) return NextResponse.json({ error: "No tenant" }, { status: 400 });

    const body = await req.json();
    const rows: Record<string, string>[] = body?.rows;

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: "rows array is required" }, { status: 400 });
    }

    // Validate and sanitise each row
    const valid: typeof rows = [];
    const errors: string[] = [];
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (!r.name || !r.phone || !r.propertyType || !r.location) {
        errors.push(`Row ${i + 1}: missing name/phone/propertyType/location`);
        continue;
      }
      valid.push(r);
    }

    if (valid.length === 0) {
      return NextResponse.json({ error: "No valid rows", details: errors }, { status: 400 });
    }

    // Bulk create leads + initial activities
    const created: string[] = [];
    for (const r of valid) {
      const lead = await prisma.lead.create({
        data: {
          tenantId,
          name: String(r.name).trim(),
          phone: String(r.phone).trim(),
          email: r.email ? String(r.email).trim() : null,
          propertyType: String(r.propertyType).trim(),
          location: String(r.location).trim(),
          source: coerceSource(r.source || ""),
          temperature: coerceTemp(r.temperature || ""),
          stage: coerceStage(r.stage || ""),
          value: r.value ? Number(r.value) || 0 : 0,
          assignedToId: null,
          notes: r.notes || null,
        },
      });

      await prisma.activity.create({
        data: {
          tenantId,
          leadId: lead.id,
          type: ActivityType.NOTE,
          description: "Lead imported via CSV",
          createdById: user.id,
        },
      });

      created.push(lead.id);
    }

    await audit({
      tenantId,
      action: "IMPORT",
      entity: "Lead",
      performedById: user.id,
      meta: { count: created.length, skipped: errors.length },
    });

    return NextResponse.json({ imported: created.length, skipped: errors.length, errors }, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
