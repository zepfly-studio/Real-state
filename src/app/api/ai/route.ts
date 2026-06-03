import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentUser, resolveTenantId } from "@/lib/session";
import { getIntegration } from "@/lib/integrations";
import { inr } from "@/lib/format";

export async function POST(req: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const tenantId = await resolveTenantId(user);
    if (!tenantId) return NextResponse.json({ error: "No tenant" }, { status: 400 });

    const body = await req.json();
    const messages: { role: "user" | "assistant"; content: string }[] = body.messages ?? [];
    if (!messages.length) {
      return NextResponse.json({ reply: "Koi sawaal poochho!", mode: "builtin" });
    }

    // ── Build live DB summary ──────────────────────────────────────────────
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const followUpCutoff = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000); // now + 3 days

    const [hotLeads, warmColdLeads, allLeads, bookings, users, topPerformerData, followUpLeads] =
      await Promise.all([
        prisma.lead.findMany({
          where: { tenantId, temperature: "HOT" },
          orderBy: { value: "desc" },
          take: 5,
          select: { name: true, value: true, stage: true, location: true, propertyType: true },
        }),
        prisma.lead.findMany({
          where: { tenantId, temperature: { in: ["WARM", "COLD"] } },
          select: { temperature: true },
        }),
        prisma.lead.findMany({
          where: { tenantId },
          select: { stage: true, value: true },
        }),
        prisma.booking.findMany({
          where: { tenantId, createdAt: { gte: monthStart } },
          select: { amount: true, bookedById: true },
        }),
        prisma.user.findMany({
          where: { tenantId, isActive: true },
          select: { id: true, name: true },
        }),
        // Top performer: user with most closed-won lead value
        prisma.lead.findMany({
          where: { tenantId, stage: "CLOSED_WON", assignedToId: { not: null } },
          select: { assignedToId: true, value: true },
        }),
        // Leads needing follow-up: nextFollowUp <= now OR nextFollowUp within 3 days
        prisma.lead.findMany({
          where: {
            tenantId,
            stage: { notIn: ["CLOSED_WON", "CLOSED_LOST"] },
            nextFollowUp: { lte: followUpCutoff },
          },
          orderBy: { nextFollowUp: "asc" },
          take: 10,
          select: { name: true, nextFollowUp: true, stage: true, temperature: true, value: true },
        }),
      ]);

    const pipelineCounts: Record<string, number> = {};
    const pipelineValues: Record<string, number> = {};
    for (const l of allLeads) {
      pipelineCounts[l.stage] = (pipelineCounts[l.stage] ?? 0) + 1;
      pipelineValues[l.stage] = (pipelineValues[l.stage] ?? 0) + Number(l.value);
    }
    const totalPipelineValue = allLeads.reduce((s, l) => s + Number(l.value), 0);
    const bookingsCount = bookings.length;
    const bookingsValue = bookings.reduce((s, b) => s + Number(b.amount), 0);
    const headcount = users.length;
    const warmCount = warmColdLeads.filter((l) => l.temperature === "WARM").length;
    const coldCount = warmColdLeads.filter((l) => l.temperature === "COLD").length;

    // Compute top performer by closed-won lead value
    const perfMap: Record<string, number> = {};
    for (const l of topPerformerData) {
      if (l.assignedToId) {
        perfMap[l.assignedToId] = (perfMap[l.assignedToId] ?? 0) + Number(l.value);
      }
    }
    const topPerfEntry = Object.entries(perfMap).sort((a, b) => b[1] - a[1])[0];
    const topPerfUser = topPerfEntry
      ? users.find((u) => u.id === topPerfEntry[0])
      : null;
    const topPerfValue = topPerfEntry ? topPerfEntry[1] : 0;

    // Overdue vs upcoming follow-ups
    const overdueFollowUps = followUpLeads.filter(
      (l) => l.nextFollowUp && new Date(l.nextFollowUp) <= now
    );
    const upcomingFollowUps = followUpLeads.filter(
      (l) => l.nextFollowUp && new Date(l.nextFollowUp) > now
    );

    const dbSummary = `
LIVE BUSINESS DATA (today: ${now.toLocaleDateString("en-IN")}):
- Lead temperature: HOT=${hotLeads.length}, WARM=${warmCount}, COLD=${coldCount}
- Hot leads (top 5 by value): ${hotLeads.map((l) => `${l.name} (${l.propertyType}, ${l.location}, ${inr(Number(l.value))})`).join("; ") || "None"}
- Pipeline by stage: NEW=${pipelineCounts.NEW ?? 0}, CONTACTED=${pipelineCounts.CONTACTED ?? 0}, SITE_VISIT=${pipelineCounts.SITE_VISIT ?? 0}, NEGOTIATION=${pipelineCounts.NEGOTIATION ?? 0}, CLOSED_WON=${pipelineCounts.CLOSED_WON ?? 0}, CLOSED_LOST=${pipelineCounts.CLOSED_LOST ?? 0}
- Total pipeline value: ${inr(totalPipelineValue)}
- This month bookings: ${bookingsCount} bookings, total value ${inr(bookingsValue)}
- Team headcount: ${headcount} active users
- Top performer (by closed-won value): ${topPerfUser ? `${topPerfUser.name} — ${inr(topPerfValue)}` : "No closed deals yet"}
- Follow-ups overdue: ${overdueFollowUps.length} leads | Due in next 3 days: ${upcomingFollowUps.length} leads
`.trim();

    const systemPrompt = `You are a smart, friendly real estate business assistant for an Indian real estate company in Jaipur. You have access to live business data and help the team with insights, analysis, and drafting messages.

Respond in friendly Hinglish (mix of Hindi and English, casual but professional). Use short paragraphs. Be specific — reference actual numbers from the data. Use ₹ for currency.

${dbSummary}`;

    // ── Try Anthropic if key available ─────────────────────────────────────
    const apiKey = await getIntegration(tenantId, "ANTHROPIC");

    if (apiKey) {
      try {
        const resp = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: "claude-sonnet-4-5",
            max_tokens: 1024,
            system: systemPrompt,
            messages: messages.map((m) => ({ role: m.role, content: m.content })),
          }),
        });

        if (resp.ok) {
          const data = await resp.json();
          const reply = data?.content?.[0]?.text ?? "Kuch samajh nahi aaya, dobara try karo!";
          return NextResponse.json({ reply, mode: "ai" });
        }
      } catch {
        // fall through to built-in engine
      }
    }

    // ── Built-in intent engine ─────────────────────────────────────────────
    const lastUserMsg = messages[messages.length - 1]?.content?.toLowerCase() ?? "";
    let reply = "";

    const isGreeting =
      lastUserMsg.match(/^(hi|hello|hey|namaste|namaskar|hii|helo|hy)\b/) ||
      lastUserMsg === "hi" ||
      lastUserMsg === "hello";

    if (isGreeting) {
      reply = `Namaste! 🙏 Main aapka Real Estate OS AI assistant hoon.\n\nMain yeh sab kar sakta hoon:\n- 🔥 **Hot leads** list karna\n- 📊 **Pipeline / funnel** breakdown dena\n- 💰 **Revenue aur bookings** summary\n- ⏰ **Follow-ups** jo pending hain\n- 🏆 **Top performer** kaun hai\n- ✍️ **Follow-up messages** draft karna\n\nBas poochho — main aapke live data se jawab dunga!`;
    } else if (
      lastUserMsg.includes("hot lead") ||
      lastUserMsg.includes("hot leads") ||
      lastUserMsg.includes("garam") ||
      lastUserMsg.includes("garam lead")
    ) {
      const topLead = hotLeads[0];
      const leadList = hotLeads
        .map((l, i) => `${i + 1}. **${l.name}** — ${l.propertyType}, ${l.location} · ${inr(Number(l.value))}`)
        .join("\n");
      reply = `🔥 Abhi aapke paas **${hotLeads.length} hot leads** hain!\n\n${leadList || "Koi hot lead nahi mila."}\n\nSabse valuable lead: **${topLead?.name ?? "—"}** (${inr(Number(topLead?.value ?? 0))})\nNegotiation stage mein: **${pipelineCounts.NEGOTIATION ?? 0} leads**\n\nIn pe aaj hi follow karo — yeh golden window hai! 💪`;
    } else if (
      lastUserMsg.includes("pipeline") ||
      lastUserMsg.includes("funnel") ||
      lastUserMsg.includes("stage")
    ) {
      reply = `📊 **Pipeline Breakdown** (Total: ${inr(totalPipelineValue)})\n\n- 🆕 New: **${pipelineCounts.NEW ?? 0}** leads (${inr(pipelineValues.NEW ?? 0)})\n- 📞 Contacted: **${pipelineCounts.CONTACTED ?? 0}** leads\n- 🏠 Site Visit: **${pipelineCounts.SITE_VISIT ?? 0}** leads\n- 🤝 Negotiation: **${pipelineCounts.NEGOTIATION ?? 0}** leads (${inr(pipelineValues.NEGOTIATION ?? 0)})\n- ✅ Closed Won: **${pipelineCounts.CLOSED_WON ?? 0}** (${inr(pipelineValues.CLOSED_WON ?? 0)})\n- ❌ Closed Lost: **${pipelineCounts.CLOSED_LOST ?? 0}**\n\n💡 Tip: Negotiation stage pe sabse zyada dhyan do — wahan ${inr(pipelineValues.NEGOTIATION ?? 0)} lock ho sakti hai!`;
    } else if (
      lastUserMsg.includes("revenue") ||
      lastUserMsg.includes("booking") ||
      lastUserMsg.includes("sales") ||
      lastUserMsg.includes("target") ||
      lastUserMsg.includes("month") ||
      lastUserMsg.includes("mahina")
    ) {
      const perfLine = topPerfUser
        ? `\n\n🏆 Top performer this month: **${topPerfUser.name}** — ${inr(topPerfValue)} closed`
        : "";
      reply = `💰 **Is Month Ka Report:**\n\n- Bookings: **${bookingsCount}** deals\n- Total value: **${inr(bookingsValue)}**\n- Avg per booking: **${bookingsCount > 0 ? inr(bookingsValue / bookingsCount) : "₹0"}**\n- Team size: **${headcount} members**${perfLine}\n\nAgar team rate maintain rahe toh month end tak aur ${headcount} bookings expect kar sakte hain! 🚀`;
    } else if (
      lastUserMsg.includes("follow up") ||
      lastUserMsg.includes("follow-up") ||
      lastUserMsg.includes("followup") ||
      lastUserMsg.includes("pending") ||
      lastUserMsg.includes("due")
    ) {
      if (followUpLeads.length === 0) {
        reply = `✅ Badhai ho! Abhi koi overdue follow-up nahi hai.\n\nTeam bahut proactive hai — sab leads up-to-date hain. 🎉`;
      } else {
        const overdueList = overdueFollowUps
          .slice(0, 5)
          .map((l) => `- **${l.name}** (${l.stage}) — ${l.nextFollowUp ? new Date(l.nextFollowUp).toLocaleDateString("en-IN") : "no date"} ⚠️`)
          .join("\n");
        const upcomingList = upcomingFollowUps
          .slice(0, 3)
          .map((l) => `- **${l.name}** — ${l.nextFollowUp ? new Date(l.nextFollowUp).toLocaleDateString("en-IN") : "soon"}`)
          .join("\n");
        reply = `⏰ **Follow-up Status:**\n\n🚨 Overdue (${overdueFollowUps.length}):\n${overdueList || "- None"}\n\n📅 Due soon — next 3 days (${upcomingFollowUps.length}):\n${upcomingList || "- None"}\n\nAaj hi yeh leads ko call/WhatsApp karo — response window close ho rahi hai!`;
      }
    } else if (
      lastUserMsg.includes("top performer") ||
      lastUserMsg.includes("performer") ||
      lastUserMsg.includes("best") ||
      lastUserMsg.includes("topper") ||
      lastUserMsg.includes("star")
    ) {
      if (topPerfUser) {
        reply = `🏆 **Top Performer:** **${topPerfUser.name}**\n\nUnhone closed-won deals mein **${inr(topPerfValue)}** generate kiye hain!\n\nPuri team mein ${headcount} members hain — ${topPerfUser.name} ko shoutout dena mat bhoolo, isse team morale boost hoti hai! 💪`;
      } else {
        reply = `Abhi tak koi closed-won deal nahi hua hai. Pipeline mein **${pipelineCounts.NEGOTIATION ?? 0} leads** negotiation stage pe hain — yeh potential stars hain! Inhe close karo. 🎯`;
      }
    } else if (
      lastUserMsg.includes("help") ||
      lastUserMsg.includes("kya kar") ||
      lastUserMsg.includes("kya kar sakte") ||
      lastUserMsg.includes("capabilities") ||
      lastUserMsg.includes("features")
    ) {
      reply = `Main yeh sab kar sakta hoon:\n\n🔥 **Hot leads** — "hot leads dikhao" ya "garam lead kaun hai"\n📊 **Pipeline** — "pipeline dikhao" ya "funnel breakdown"\n💰 **Revenue** — "is month ki bookings" ya "sales target"\n⏰ **Follow-ups** — "pending follow-ups" ya "overdue leads"\n🏆 **Performer** — "top performer kaun hai"\n✍️ **Messages** — "follow-up message draft karo"\n\nKoi bhi cheez poochho — main aapke live CRM data se jawab dunga! 🙏`;
    } else if (
      lastUserMsg.includes("draft") ||
      lastUserMsg.includes("message") ||
      lastUserMsg.includes("whatsapp") ||
      lastUserMsg.includes("likhna")
    ) {
      const lead = hotLeads[0];
      reply = `✍️ Yeh lo ek ready-to-use follow-up message:\n\n---\n*"Namaste ${lead?.name ?? "[Client Name]"} ji! 🙏*\n\n*Hope aap bilkul theek hain! Maine specifically aapke liye ek **${lead?.propertyType ?? "property"}** ${lead?.location ?? "Jaipur"} mein shortlist ki hai — budget ${inr(Number(lead?.value ?? 0))} ke bilkul andar hai.*\n\n*Kya aap kal ya parso 15-20 minutes ke liye available hain? Main aapko poori details share karta hoon. 😊"*\n\n---\n💡 WhatsApp pe send karo — 70%+ response rate hoti hai personal messages ki!`;
    } else {
      // Fallback: helpful business summary
      const chips = ["Hot leads dikhao", "Pipeline breakdown", "Is month ki bookings", "Follow-up pending", "Top performer kaun"];
      reply = `Namaste! 🤖 Yeh lo aaj ki **quick business snapshot:**\n\n- 🔥 Hot leads: **${hotLeads.length}** | Warm: **${warmCount}** | Cold: **${coldCount}**\n- 📊 Total pipeline: **${inr(totalPipelineValue)}**\n- 💰 Is month bookings: **${bookingsCount}** deals · **${inr(bookingsValue)}**\n- ⏰ Follow-ups overdue: **${overdueFollowUps.length}** | Due soon: **${upcomingFollowUps.length}**\n- 👥 Team: **${headcount} members**\n\n💡 Suggestion chips: ${chips.map((c) => `"${c}"`).join(", ")}`;
    }

    return NextResponse.json({ reply, mode: "builtin" });
  } catch (e) {
    console.error("[AI route error]", e);
    return NextResponse.json(
      { reply: "Kuch technical issue aa gaya. Thodi der baad try karo!", mode: "builtin" },
      { status: 200 } // never error the client
    );
  }
}
