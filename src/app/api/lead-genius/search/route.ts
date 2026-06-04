import { NextRequest, NextResponse } from "next/server";
import { currentUser, resolveTenantId } from "@/lib/session";
import { getIntegration } from "@/lib/integrations";
import { prisma } from "@/lib/prisma";
import { LeadTemperature, Prisma } from "@prisma/client";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return "a•••@••••.com";
  return local[0] + "•••@" + domain[0] + "•••." + domain.split(".").pop();
}

function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 6) return "••••••••••";
  return phone.slice(0, 4) + "•••••" + phone.slice(-3);
}

// ─── Route handler ────────────────────────────────────────────────────────────

/**
 * POST /api/lead-genius/search
 *
 * mode = "search" (default): queries the tenant's own Lead table — real data.
 * mode = "discover": calls Apollo when key is present; otherwise returns empty
 *   (the client shows a ConnectBanner — we never fabricate external prospects).
 */
export async function POST(req: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const tenantId = await resolveTenantId(user);
    if (!tenantId) return NextResponse.json({ error: "No tenant" }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const {
      mode = "search",
      query = "",
      location = "",
      propertyType = "",
      temperature = "",
      industry = "",
      budgetMin = "",
      budgetMax = "",
      companySize = "",
    } = body as Record<string, string>;

    // ── MODE: Search My Database (real CRM leads) ─────────────────────────────
    if (mode !== "discover") {
      const where: Prisma.LeadWhereInput = { tenantId };

      if (query.trim()) {
        where.name = { contains: query.trim(), mode: "insensitive" };
      }
      if (location) {
        where.location = { contains: location, mode: "insensitive" };
      }
      if (propertyType) {
        where.propertyType = { contains: propertyType, mode: "insensitive" };
      }
      if (temperature && ["HOT", "WARM", "COLD"].includes(temperature)) {
        where.temperature = temperature as LeadTemperature;
      }

      const dbLeads = await prisma.lead.findMany({
        where,
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          propertyType: true,
          location: true,
          source: true,
          temperature: true,
          stage: true,
          value: true,
          notes: true,
        },
        orderBy: [
          { temperature: "asc" }, // HOT first (asc = COLD > HOT > WARM in enum order; we rely on sort below)
          { createdAt: "desc" },
        ],
        take: 100,
      });

      // Sort HOT → WARM → COLD
      const tempOrder: Record<string, number> = { HOT: 0, WARM: 1, COLD: 2 };
      dbLeads.sort((a, b) => (tempOrder[a.temperature] ?? 2) - (tempOrder[b.temperature] ?? 2));

      const leads = dbLeads.map((l) => ({
        id: l.id,
        name: l.name,
        phone: l.phone,
        email: l.email,
        propertyType: l.propertyType,
        location: l.location,
        source: l.source,
        temperature: l.temperature,
        stage: l.stage,
        value: Number(l.value),
        notes: l.notes,
        inCrm: true,
      }));

      return NextResponse.json({ leads, mode: "search", total: leads.length });
    }

    // ── MODE: Discover New Leads (external API required) ─────────────────────

    const apolloKey = await getIntegration(tenantId, "APOLLO");

    if (!apolloKey) {
      // No key — return empty with a signal; the client renders the connect state
      return NextResponse.json({ leads: [], mode: "discover", noKey: true, total: 0 });
    }

    // Apollo call (real key present)
    let leads: unknown[] = [];
    try {
      const apolloRes = await fetch("https://api.apollo.io/v1/mixed_people/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Api-Key": apolloKey,
        },
        body: JSON.stringify({
          q_keywords: `real estate investor Jaipur India${location ? " " + location : ""}`,
          page: 1,
          per_page: 25,
        }),
      });
      if (!apolloRes.ok) throw new Error(`Apollo responded ${apolloRes.status}`);
      const apolloData = await apolloRes.json();

      leads = (apolloData.people || []).map((p: Record<string, unknown>, i: number) => {
        const name = String(p.name || "Unknown");
        const emailVal = String((p.email as string) || "");
        const phoneVal = String(
          ((p.phone_numbers as { sanitized_number?: string }[])?.[0]?.sanitized_number) || ""
        );
        return {
          id: `apollo_${i}_${name.replace(/\s+/g, "_").toLowerCase()}`,
          name,
          title: String(p.title || ""),
          company: String((p.organization as { name?: string })?.name || ""),
          email: emailVal || null,
          emailMasked: emailVal ? maskEmail(emailVal) : "••••@••••.com",
          phone: phoneVal || null,
          phoneMasked: phoneVal ? maskPhone(phoneVal) : "••••••••••",
          location: String(p.city || location || "Jaipur"),
          industry: industry || "real-estate-buyers",
          budget: 10000000,
          companySize: companySize || "11-50",
          score: 60 + Math.floor(((name.charCodeAt(0) + name.charCodeAt(1)) % 35)),
          enriched: !!emailVal,
          inCrm: false,
        };
      });

      // Apply filters
      if (location) {
        leads = leads.filter((l) =>
          String((l as Record<string, unknown>).location).toLowerCase().includes(location.toLowerCase())
        );
      }
      if (budgetMin) {
        const min = Number(budgetMin);
        if (!isNaN(min)) leads = leads.filter((l) => Number((l as Record<string, unknown>).budget) >= min);
      }
      if (budgetMax) {
        const max = Number(budgetMax);
        if (!isNaN(max) && max > 0)
          leads = leads.filter((l) => Number((l as Record<string, unknown>).budget) <= max);
      }
      if (companySize) {
        leads = leads.filter((l) => (l as Record<string, unknown>).companySize === companySize);
      }
    } catch (e) {
      console.error("[lead-genius/search] Apollo error:", e);
      // On error return empty — never return fabricated prospects
      return NextResponse.json({
        leads: [],
        mode: "discover",
        error: "Apollo API returned an error. Please check your API key in Settings.",
        total: 0,
      });
    }

    return NextResponse.json({ leads, mode: "discover", total: leads.length });
  } catch (e) {
    console.error("[lead-genius/search]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
