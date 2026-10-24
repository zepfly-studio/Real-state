import { getIntegration } from "@/lib/integrations";

/**
 * Defensive Smartlead client (https://api.smartlead.ai).
 *  - the API key lives on the server only (Settings → Integrations → SMARTLEAD);
 *  - Smartlead's schema is partly documented, so every field is read defensively and
 *    unknown shapes become empty values rather than crashes;
 *  - 429s are retried with backoff and reads are cached briefly per workspace;
 *  - mailbox objects contain SMTP/IMAP passwords — only a whitelist is ever returned.
 */

const BASE = (process.env.SMARTLEAD_BASE_URL || "https://server.smartlead.ai/api/v1").replace(/\/+$/, "");
const UA = "Mozilla/5.0 (compatible; RealEstateOS/1.0)";
export const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export class SmartleadNotConnected extends Error {}
export class SmartleadError extends Error {
  constructor(public status: number, public detail: string) {
    super(detail);
  }
}

// ── cache (per tenant) ───────────────────────────────────────────────────────
const cache = new Map<string, { at: number; value: unknown }>();
const ck = (t: string, k: string) => `${t}:${k}`;
function cget<T>(t: string, k: string, ttlMs: number): T | undefined {
  const hit = cache.get(ck(t, k));
  return hit && Date.now() - hit.at < ttlMs ? (hit.value as T) : undefined;
}
function cput<T>(t: string, k: string, value: T): T {
  cache.set(ck(t, k), { at: Date.now(), value });
  return value;
}
export function clearCache(tenantId: string) {
  for (const k of Array.from(cache.keys())) if (k.startsWith(`${tenantId}:`)) cache.delete(k);
}

// ── tiny semaphore: at most 4 requests in flight ─────────────────────────────
let inflight = 0;
const waiters: Array<() => void> = [];
async function acquire() {
  if (inflight >= 4) await new Promise<void>((r) => waiters.push(r));
  inflight++;
}
function release() {
  inflight--;
  waiters.shift()?.();
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function friendly(status: number, body: any): string {
  const msg = String(body?.message ?? body?.error ?? "");
  if (status === 401) return "Smartlead rejected the API key. Check it in Setup.";
  if (status === 429) return "Smartlead is rate-limiting requests. Wait a minute and retry.";
  if (status === 404) return msg || "Smartlead couldn't find that item.";
  if (status === 422) return msg || "Smartlead rejected the request as invalid.";
  return msg || `Smartlead returned an error (${status}).`;
}

export async function sl(
  tenantId: string,
  method: "GET" | "POST" | "PUT" | "DELETE",
  path: string,
  opts: { params?: Record<string, string | number>; json?: unknown; timeoutMs?: number } = {}
): Promise<any> {
  const key = await getIntegration(tenantId, "SMARTLEAD");
  if (!key) throw new SmartleadNotConnected();

  const qs = new URLSearchParams({ api_key: key });
  for (const [k, v] of Object.entries(opts.params ?? {})) qs.set(k, String(v));
  const url = `${BASE}${path}?${qs}`;

  let last = "";
  for (let attempt = 0; attempt < 3; attempt++) {
    await acquire();
    let res: Response | null = null;
    try {
      res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", "User-Agent": UA },
        body: opts.json === undefined ? undefined : JSON.stringify(opts.json),
        signal: AbortSignal.timeout(opts.timeoutMs ?? 30_000),
        cache: "no-store",
      });
    } catch (e: any) {
      last = e?.name || "network error";
    } finally {
      release();
    }
    if (!res) {
      await sleep(600 * (attempt + 1));
      continue;
    }
    if (res.status === 429 && attempt < 2) {
      await sleep(1200 * (attempt + 1));
      continue;
    }
    const text = await res.text();
    let body: any;
    try {
      body = JSON.parse(text);
    } catch {
      body = { message: text.slice(0, 200) };
    }
    if (res.status >= 400) throw new SmartleadError(res.status, friendly(res.status, body));
    return body;
  }
  throw new SmartleadError(502, `Couldn't reach Smartlead (${last || "unknown error"}).`);
}

// ── normalisers ──────────────────────────────────────────────────────────────
export const toInt = (v: unknown): number => {
  const n = Math.trunc(Number(v));
  return Number.isFinite(n) ? n : 0;
};
export const pct = (part: number, whole: number): number => (whole ? Math.round((part * 1000) / whole) / 10 : 0);

export interface EmailCampaign {
  id: number;
  name: string;
  status: string;
  created_at: string | null;
  leads: number;
  sent: number;
  opened: number;
  clicked: number;
  replied: number;
  positive: number;
  bounced: number;
  unsubscribed: number;
  open_rate: number;
  click_rate: number;
  reply_rate: number;
  bounce_rate: number;
  progress: { total: number; completed: number; in_progress: number; not_started: number; blocked: number; paused: number; stopped: number };
  has_analytics: boolean;
}

function normalizeCampaign(c: any, a: any, positives: Record<number, any>): EmailCampaign {
  a = a || {};
  const stats = a.campaign_lead_stats || {};
  const sent = toInt(a.unique_sent_count) || toInt(a.sent_count);
  const opened = toInt(a.unique_open_count) || toInt(a.open_count);
  const clicked = toInt(a.unique_click_count) || toInt(a.click_count);
  const extra = positives[toInt(c.id)] || {};
  const replied = toInt(a.reply_count) || toInt(extra.replied);
  const bounced = toInt(a.bounce_count);
  const leads = toInt(stats.total) || toInt(a.total_count);
  return {
    id: toInt(c.id),
    name: c.name || `Campaign ${c.id}`,
    status: String(c.status || "UNKNOWN").toUpperCase(),
    created_at: c.created_at ?? null,
    leads,
    sent,
    opened,
    clicked,
    replied,
    positive: toInt(extra.positive_replied),
    bounced,
    unsubscribed: toInt(a.unsubscribed_count),
    open_rate: pct(opened, sent),
    click_rate: pct(clicked, sent),
    reply_rate: pct(replied, sent),
    bounce_rate: pct(bounced, sent),
    progress: {
      total: leads,
      completed: toInt(stats.completed),
      in_progress: toInt(stats.inprogress),
      not_started: toInt(stats.notStarted),
      blocked: toInt(stats.blocked),
      paused: toInt(stats.paused),
      stopped: toInt(stats.stopped),
    },
    has_analytics: Object.keys(a).length > 0,
  };
}

export function normalizeLead(entry: any) {
  const lead = entry?.lead || {};
  return {
    map_id: entry?.campaign_lead_map_id ?? null,
    status: String(entry?.status || "").toUpperCase(),
    category_id: entry?.lead_category_id ?? null,
    created_at: entry?.created_at ?? null,
    lead_id: lead.id ?? null,
    email: lead.email || "",
    first_name: lead.first_name || "",
    last_name: lead.last_name || "",
    phone: lead.phone_number || "",
    company: lead.company_name || "",
    website: lead.website || "",
    location: lead.location || "",
    unsubscribed: Boolean(lead.is_unsubscribed),
  };
}

function reputation(v: unknown): number | null {
  const m = String(v ?? "").match(/-?\d+(\.\d+)?/);
  return m ? Math.trunc(parseFloat(m[0])) : null;
}

/** Explicit whitelist — the raw object contains SMTP/IMAP passwords. */
export function normalizeAccount(a: any) {
  const w = a?.warmup_details || {};
  return {
    id: toInt(a?.id),
    name: a?.from_name || "",
    email: a?.from_email || a?.username || "",
    type: a?.type || "SMTP",
    daily_limit: toInt(a?.message_per_day),
    sent_today: toInt(a?.daily_sent_count),
    smtp_ok: a?.is_smtp_success ?? null,
    imap_ok: a?.is_imap_success ?? null,
    smtp_error: a?.smtp_failure_error ?? null,
    imap_error: a?.imap_failure_error ?? null,
    warmup_status: String(w.status || "INACTIVE").toUpperCase(),
    warmup_reputation: reputation(w.warmup_reputation),
    warmup_sent: toInt(w.total_sent_count),
    warmup_spam: toInt(w.total_spam_count),
    warmup_blocked_reason: w.blocked_reason ?? null,
    campaign_count: toInt(a?.campaign_count),
  };
}

export function stripHtml(s: string): string {
  return String(s ?? "")
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>|<\/p>|<\/div>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function normalizeInboxItem(m: any) {
  const lead = m?.lead || {};
  const last = m?.last_message || {};
  const camp = m?.campaign || {};
  const cat = m?.category || {};
  const name = [lead.first_name, lead.last_name].filter(Boolean).join(" ") || lead.email || "Unknown";
  return {
    id: String(m?.id ?? m?.campaign_lead_map_id ?? ""),
    map_id: m?.campaign_lead_map_id ?? null,
    lead: { email: lead.email || "", name, company: lead.company || "", phone: lead.phone || "" },
    campaign: { id: toInt(camp.id), name: camp.name || "" },
    subject: last.subject || "",
    preview: stripHtml(last.body || "").slice(0, 200),
    received_at: last.received_at ?? null,
    category: cat.name || "",
    is_read: Boolean(m?.is_read),
    email_status: m?.email_status || "",
  };
}

export function normalizeHistory(item: any) {
  return (item?.message_history ?? []).map((h: any) => {
    const dir = String(h?.direction || h?.type || "").toLowerCase();
    const inbound = ["inbound", "reply", "received", "incoming"].includes(dir) || (!dir && Boolean(h?.received_at));
    return {
      id: String(h?.id ?? h?.message_id ?? ""),
      stats_id: h?.stats_id ?? h?.email_stats_id ?? null,
      message_id: h?.message_id ?? null,
      subject: h?.subject || "",
      body: stripHtml(h?.body || h?.email_body || ""),
      direction: inbound ? "INBOUND" : "OUTBOUND",
      at: h?.received_at || h?.sent_at || h?.time || null,
      opened_at: h?.opened_at ?? null,
    };
  });
}

// ── high level ───────────────────────────────────────────────────────────────
async function listCampaigns(t: string): Promise<any[]> {
  const hit = cget<any[]>(t, "campaigns", 60_000);
  if (hit) return hit;
  let data = await sl(t, "GET", "/campaigns/");
  if (data && !Array.isArray(data)) data = data.campaigns ?? data.data ?? [];
  return cput(t, "campaigns", Array.isArray(data) ? data : []);
}

async function analytics(t: string, id: number): Promise<any | null> {
  const hit = cget<any>(t, `an:${id}`, 60_000);
  if (hit !== undefined) return hit || null;
  try {
    const data = await sl(t, "GET", `/campaigns/${id}/analytics`);
    return cput(t, `an:${id}`, data && typeof data === "object" ? data : {}) || null;
  } catch (e) {
    if (e instanceof SmartleadError && (e.status === 401 || e.status === 429)) throw e;
    cput(t, `an:${id}`, {});
    return null;
  }
}

async function positives(t: string, ids: number[]): Promise<Record<number, any>> {
  if (!ids.length) return {};
  const key = "pos:" + [...ids].sort((a, b) => a - b).join(",");
  const hit = cget<Record<number, any>>(t, key, 120_000);
  if (hit) return hit;
  let out: Record<number, any> = {};
  try {
    const data = await sl(t, "GET", "/analytics/campaign/overall-stats", {
      params: { start_date: "2020-01-01", end_date: new Date().toISOString().slice(0, 10), campaign_ids: ids.join(",") },
    });
    for (const r of data?.data?.campaign_wise_performance ?? []) out[toInt(r.id)] = r;
  } catch (e) {
    if (e instanceof SmartleadError && e.status === 401) throw e;
    out = {}; // optional enrichment: never break the page for it
  }
  return cput(t, key, out);
}

export async function campaignsWithStats(t: string, force = false): Promise<EmailCampaign[]> {
  if (force) clearCache(t);
  const raw = await listCampaigns(t);
  const ids = raw.map((c) => toInt(c.id));
  const [an, pos] = await Promise.all([Promise.all(ids.map((i) => analytics(t, i))), positives(t, ids)]);
  return raw.map((c, i) => normalizeCampaign(c, an[i], pos));
}

export function totals(items: EmailCampaign[]) {
  const sum = (k: keyof EmailCampaign) => items.reduce((s, c) => s + (c[k] as number), 0);
  const t = {
    leads: sum("leads"), sent: sum("sent"), opened: sum("opened"), clicked: sum("clicked"),
    replied: sum("replied"), positive: sum("positive"), bounced: sum("bounced"), unsubscribed: sum("unsubscribed"),
    campaigns: items.length, active: items.filter((c) => c.status === "ACTIVE").length,
    open_rate: 0, click_rate: 0, reply_rate: 0, bounce_rate: 0,
  };
  t.open_rate = pct(t.opened, t.sent);
  t.click_rate = pct(t.clicked, t.sent);
  t.reply_rate = pct(t.replied, t.sent);
  t.bounce_rate = pct(t.bounced, t.sent);
  return t;
}

export async function inboxQuery(t: string, body: Record<string, unknown>, history: boolean) {
  return sl(t, "POST", "/master-inbox/inbox-replies", { params: { fetch_message_history: history ? "true" : "false" }, json: body });
}

export function normalizeSteps(data: any) {
  const rows = Array.isArray(data) ? data : data?.data ?? [];
  return (rows as any[])
    .map((s) => {
      const delay = s?.seq_delay_details || {};
      const variants = s?.sequence_variants || s?.seq_variants || [];
      return {
        seq_number: toInt(s?.seq_number),
        subject: s?.subject || "",
        body: s?.email_body || "",
        delay_days: toInt("delayInDays" in delay ? delay.delayInDays : delay.delay_in_days),
        variants: variants.length,
        editable: variants.length <= 1,
      };
    })
    .sort((a, b) => a.seq_number - b.seq_number);
}
