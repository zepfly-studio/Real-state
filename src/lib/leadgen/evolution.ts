import { getIntegration } from "@/lib/integrations";

/** Evolution API (CloudStation) — send a WhatsApp text and read the instance state. */

// CloudStation sits behind Cloudflare, which blocks default server user-agents. A normal UA is accepted.
const UA = "Mozilla/5.0 (compatible; RealEstateOS/1.0)";

export class WhatsAppError extends Error {
  constructor(public status: number, public detail: string) {
    super(detail);
  }
}

export class WhatsAppNotConnected extends Error {}

interface Cfg {
  url: string;
  instance: string;
  key: string;
}

export async function evolutionConfig(tenantId: string): Promise<Cfg> {
  const [url, instance, key] = await Promise.all([
    getIntegration(tenantId, "EVOLUTION_URL"),
    getIntegration(tenantId, "EVOLUTION_INSTANCE"),
    getIntegration(tenantId, "EVOLUTION_KEY"),
  ]);
  if (!url || !instance || !key) throw new WhatsAppNotConnected();
  return { url: url.replace(/\/+$/, ""), instance, key };
}

async function call(cfg: Cfg, method: string, path: string, body?: unknown): Promise<{ status: number; body: any }> {
  try {
    const res = await fetch(`${cfg.url}${path}`, {
      method,
      headers: { "Content-Type": "application/json", apikey: cfg.key, "User-Agent": UA },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(25_000),
      cache: "no-store",
    });
    const text = await res.text();
    let parsed: any = null;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = { message: text.slice(0, 200) };
    }
    return { status: res.status, body: parsed };
  } catch {
    throw new WhatsAppError(502, "Couldn't reach the WhatsApp server.");
  }
}

/** Pull a human reason out of Evolution's nested error shapes. */
function reason(body: any): string {
  const msgs = body?.response?.message;
  if (Array.isArray(msgs) && msgs.length) {
    const first = msgs[0];
    if (first && typeof first === "object" && first.exists === false) return "That number isn't on WhatsApp.";
    return String(typeof first === "string" ? first : JSON.stringify(first)).slice(0, 160);
  }
  if (typeof msgs === "string") return msgs.slice(0, 160);
  return String(body?.message ?? body?.error ?? "").slice(0, 160);
}

export async function sendText(tenantId: string, phone: string, text: string) {
  const cfg = await evolutionConfig(tenantId);
  const number = String(phone).replace(/\D/g, "");
  if (number.length < 8) throw new WhatsAppError(422, "That doesn't look like a valid phone number.");
  const { status, body } = await call(cfg, "POST", `/message/sendText/${encodeURIComponent(cfg.instance)}`, { number, text });
  if (status === 401) throw new WhatsAppError(401, "The WhatsApp server rejected the API key.");
  if (status >= 500) throw new WhatsAppError(502, `The WhatsApp server is down (HTTP ${status}), so the message wasn't sent.`);
  if (status >= 400 || !body?.key?.id) {
    throw new WhatsAppError(status >= 500 ? 502 : 422, reason(body) || "WhatsApp didn't accept the message.");
  }
  return body;
}

export interface InstanceInfo {
  found: boolean;
  state: string;
  owner: string | null;
  available: string[];
}

export async function instanceInfo(tenantId: string): Promise<InstanceInfo> {
  const cfg = await evolutionConfig(tenantId);
  const { status, body } = await call(cfg, "GET", "/instance/fetchInstances");
  if (status === 401) throw new WhatsAppError(401, "The WhatsApp server rejected the API key.");
  if (status >= 500) throw new WhatsAppError(502, `The WhatsApp server is down (HTTP ${status}). Start your Evolution / CloudStation service, then test again.`);
  if (status >= 400 || !Array.isArray(body)) throw new WhatsAppError(502, "The WhatsApp server returned an unexpected reply.");
  const names = body.map((i: any) => (i?.instance ?? i)?.name ?? (i?.instance ?? i)?.instanceName).filter(Boolean);
  for (const item of body) {
    const x = item?.instance ?? item ?? {};
    if (x.name === cfg.instance || x.instanceName === cfg.instance) {
      return { found: true, state: x.connectionStatus || x.status || "unknown", owner: x.ownerJid ?? null, available: names };
    }
  }
  return { found: false, state: "missing", owner: null, available: names };
}
