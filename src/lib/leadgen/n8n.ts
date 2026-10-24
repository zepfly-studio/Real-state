import { getIntegration } from "@/lib/integrations";
import type { SearchPlan } from "./plan";

/**
 * Start the n8n scrape-and-outreach workflow for a campaign.
 * The webhook URL comes from Settings → Integrations (N8N_WEBHOOK) or the N8N_WEBHOOK_URL env var.
 * n8n answers immediately (it responds 200 before scraping), so this never blocks the launch.
 */
export async function fireN8n(
  tenantId: string,
  payload: { campaign_id: string; transcript: string; location: string; lead_count: number; plan: SearchPlan; apify_input: Record<string, unknown> }
): Promise<{ ok: boolean; detail: string; configured: boolean }> {
  const url = (await getIntegration(tenantId, "N8N_WEBHOOK")) || process.env.N8N_WEBHOOK_URL || "";
  if (!url) {
    return { ok: false, configured: false, detail: "n8n isn't connected yet. Add the campaign webhook URL under Lead Generation → Setup." };
  }
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, source: "crm" }),
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });
    const text = (await res.text()).slice(0, 160);
    return { ok: res.status < 400, configured: true, detail: `n8n ${res.status}: ${text}` };
  } catch {
    return { ok: false, configured: true, detail: "n8n couldn't be reached, so this campaign didn't start." };
  }
}
