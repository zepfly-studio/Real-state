import { NextRequest, NextResponse } from "next/server";
import { currentUser, resolveTenantId } from "@/lib/session";
import { getIntegration } from "@/lib/integrations";

/**
 * GET /api/email-digest
 * Returns mock digest data (or, when GMAIL key is present, the note that
 * real Gmail integration would be called here).
 * Never throws — always returns JSON.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await resolveTenantId(user);
    if (!tenantId) {
      return NextResponse.json({ error: "No tenant" }, { status: 400 });
    }

    const gmailKey = await getIntegration(tenantId, "GMAIL");

    if (!gmailKey) {
      // Demo mode — return mock summary stats
      return NextResponse.json({
        demo: true,
        summary: { urgent: 4, needReply: 5, newsletters: 2, unread: 4 },
        message: "Demo data. Connect Gmail in Settings → Integrations to summarise your real inbox.",
      });
    }

    // Real path — call Gmail API here with gmailKey (OAuth token / client ID)
    // const inbox = await fetchGmailInbox(gmailKey);
    // const digest = await summariseWithAI(inbox);
    return NextResponse.json({
      demo: false,
      summary: { urgent: 0, needReply: 0, newsletters: 0, unread: 0 },
      message: "Gmail key detected. Implement fetchGmailInbox() to read the live inbox.",
    });
  } catch (err) {
    console.error("[email-digest]", err);
    // Never throw — safe fallback
    return NextResponse.json(
      { demo: true, error: "Failed to load digest. Showing mock data." },
      { status: 200 }
    );
  }
}
