import { NextResponse } from "next/server";
import { getIntegration } from "@/lib/integrations";
import { lgContext, isResponse } from "@/lib/leadgen/guard";
import { testLlm } from "@/lib/leadgen/llm";
import { instanceInfo, WhatsAppError, WhatsAppNotConnected } from "@/lib/leadgen/evolution";
import { campaignsWithStats, clearCache, SmartleadError, SmartleadNotConnected } from "@/lib/leadgen/smartlead";

/** POST { tool: "smartlead" | "whatsapp" | "openai" | "n8n" } — always answers 200 { ok, message }; a failed test is data. */
export async function POST(req: Request) {
  const ctx = await lgContext({ manage: true });
  if (isResponse(ctx)) return ctx;
  const { tool } = await req.json().catch(() => ({}));
  const t = ctx.tenantId;

  try {
    if (tool === "smartlead") {
      clearCache(t);
      const items = await campaignsWithStats(t, true);
      return NextResponse.json({ ok: true, message: `Connected. Found ${items.length} campaign${items.length === 1 ? "" : "s"}.` });
    }
    if (tool === "openai") return NextResponse.json(await testLlm(t));
    if (tool === "whatsapp") {
      const info = await instanceInfo(t);
      if (!info.found) {
        return NextResponse.json({ ok: false, message: `Connected to the server, but that instance name wasn't found. Available: ${info.available.join(", ") || "none"}.` });
      }
      if (info.state !== "open") return NextResponse.json({ ok: false, message: `Instance found but WhatsApp is '${info.state}'. Re-scan the QR code in Evolution.` });
      return NextResponse.json({ ok: true, message: "Connected. WhatsApp is online." });
    }
    if (tool === "n8n") {
      const url = (await getIntegration(t, "N8N_WEBHOOK")) || "";
      if (!url) return NextResponse.json({ ok: false, message: "Add the n8n webhook URL first." });
      if (!/^https?:\/\//i.test(url)) return NextResponse.json({ ok: false, message: "That doesn't look like a web address." });
      // n8n only answers a webhook while the workflow is published, so a non-404 reply means it is listening.
      try {
        const res = await fetch(url, { method: "OPTIONS", signal: AbortSignal.timeout(8000), cache: "no-store" });
        if (res.status === 404) return NextResponse.json({ ok: false, message: "n8n is reachable but that webhook isn't active. Publish the workflow in n8n." });
        return NextResponse.json({ ok: true, message: "n8n is reachable and the webhook is listening." });
      } catch {
        return NextResponse.json({ ok: false, message: "Couldn't reach n8n at that address." });
      }
    }
    return NextResponse.json({ ok: false, message: "Nothing to test." });
  } catch (e) {
    if (e instanceof SmartleadNotConnected) return NextResponse.json({ ok: false, message: "Add your Smartlead API key first." });
    if (e instanceof SmartleadError) return NextResponse.json({ ok: false, message: e.detail });
    if (e instanceof WhatsAppNotConnected) return NextResponse.json({ ok: false, message: "Add the WhatsApp server URL, instance and key first." });
    if (e instanceof WhatsAppError) return NextResponse.json({ ok: false, message: e.detail });
    return NextResponse.json({ ok: false, message: "That test failed unexpectedly." });
  }
}
