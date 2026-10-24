import { prisma } from "./prisma";

/** Map of integration name -> env var fallback. */
const ENV_FALLBACK: Record<string, string | undefined> = {
  ANTHROPIC: process.env.ANTHROPIC_API_KEY,
  NEWS_API: process.env.NEWS_API_KEY,
  WHATSAPP: process.env.WHATSAPP_API_KEY,
  APOLLO: process.env.APOLLO_API_KEY,
  HUNTER: process.env.HUNTER_API_KEY,
  CLEARBIT: process.env.CLEARBIT_API_KEY,
  RAZORPAY: process.env.RAZORPAY_KEY_ID,
  EXOTEL: process.env.EXOTEL_API_KEY,
  MYOPERATOR: process.env.MYOPERATOR_API_KEY,
  SMTP: process.env.SMTP_URL,
  GMAIL: process.env.GMAIL_CLIENT_ID,
  META: process.env.META_ACCESS_TOKEN,
  GMAPS: process.env.GMAPS_API_KEY,
  GMB: process.env.GMB_API_KEY,
  SMS: process.env.SMS_API_KEY,
  MARKET_DATA: process.env.MARKET_DATA_API_KEY,
  // Lead Generation add-on
  SMARTLEAD: process.env.SMARTLEAD_API_KEY,
  GEMINI: process.env.GEMINI_API_KEY,
  EVOLUTION_URL: process.env.EVOLUTION_API_URL,
  EVOLUTION_INSTANCE: process.env.EVOLUTION_INSTANCE,
  EVOLUTION_KEY: process.env.EVOLUTION_API_KEY,
  N8N_WEBHOOK: process.env.N8N_WEBHOOK_URL,
};

export interface IntegrationMeta {
  name: string;
  label: string;
  description: string; // what this enables
}

export const INTEGRATIONS: IntegrationMeta[] = [
  { name: "ANTHROPIC", label: "Anthropic (Claude)", description: "Powers the AI Assistant, SEO writer and Creatives copy." },
  { name: "NEWS_API", label: "News API", description: "Live property news feed (newsapi.org). Falls back to curated demo news." },
  { name: "WHATSAPP", label: "WhatsApp Business", description: "Send templates & broadcasts via 360dialog / Interakt." },
  { name: "APOLLO", label: "Apollo.io", description: "Lead Genius — B2B contact & company enrichment." },
  { name: "HUNTER", label: "Hunter.io", description: "Lead Genius — verified email finder." },
  { name: "CLEARBIT", label: "Clearbit", description: "Lead Genius — company firmographic enrichment." },
  { name: "RAZORPAY", label: "Razorpay / Cashfree", description: "Collect booking tokens & payments online." },
  { name: "EXOTEL", label: "Exotel", description: "Cloud telephony / IVR for the calling module." },
  { name: "MYOPERATOR", label: "MyOperator", description: "Alternative IVR & call-recording provider." },
  { name: "SMTP", label: "SMTP", description: "Outbound transactional email & digests." },
  { name: "GMAIL", label: "Gmail", description: "Smart Email Digest — read & summarise inbox." },
  { name: "META", label: "Meta (IG/FB)", description: "Publish scheduled posts to Instagram & Facebook." },
  { name: "GMAPS", label: "Google Maps", description: "Geocoding & maps for GMB extractor." },
  { name: "GMB", label: "Google Business Profile", description: "Pull reviews / insights & publish GMB posts." },
  { name: "SMS", label: "SMS Gateway", description: "Transactional SMS notifications." },
  { name: "MARKET_DATA", label: "Market Data (PropEquity / Liases Foras)", description: "Live area-level ₹/sqft market index for Property Price Trends. Without it, trends are derived from your own inventory." },
  // ── Lead Generation add-on (also connectable from Lead Generation → Setup) ──
  { name: "SMARTLEAD", label: "Smartlead", description: "Lead Generation — cold-email campaigns, mailboxes, replies and analytics." },
  { name: "GEMINI", label: "Google Gemini", description: "Lead Generation — the voice assistant and spoken-brief reader." },
  { name: "EVOLUTION_URL", label: "WhatsApp (Evolution) — server URL", description: "Lead Generation — address of your Evolution / CloudStation server." },
  { name: "EVOLUTION_INSTANCE", label: "WhatsApp (Evolution) — instance", description: "Lead Generation — the WhatsApp instance name, exactly as in Evolution." },
  { name: "EVOLUTION_KEY", label: "WhatsApp (Evolution) — API key", description: "Lead Generation — send and read WhatsApp chats and auto-replies." },
  { name: "N8N_WEBHOOK", label: "n8n campaign webhook", description: "Lead Generation — the n8n URL that starts a campaign when you launch one." },
];

export interface IntegrationStatus {
  name: string;
  connected: boolean;
  source: "tenant" | "env" | "none";
}

/**
 * Resolve an integration value: DB (tenant) → env → null.
 * NEVER throws — a missing key just means the feature runs in mock mode.
 */
export async function getIntegration(
  tenantId: string | null,
  name: string
): Promise<string | null> {
  if (tenantId) {
    const row = await prisma.integration
      .findUnique({ where: { tenantId_name: { tenantId, name } } })
      .catch(() => null);
    if (row?.isActive && row.value) return row.value;
  }
  return ENV_FALLBACK[name] || null;
}

export async function getIntegrationStatuses(
  tenantId: string | null
): Promise<IntegrationStatus[]> {
  const rows = tenantId
    ? await prisma.integration.findMany({ where: { tenantId } }).catch(() => [])
    : [];
  return INTEGRATIONS.map((meta) => {
    const row = rows.find((r) => r.name === meta.name);
    if (row?.isActive && row.value) return { name: meta.name, connected: true, source: "tenant" };
    if (ENV_FALLBACK[meta.name]) return { name: meta.name, connected: true, source: "env" };
    return { name: meta.name, connected: false, source: "none" };
  });
}

export function maskKey(value?: string | null): string {
  if (!value) return "";
  if (value.length <= 8) return "••••••••";
  return value.slice(0, 4) + "••••••••" + value.slice(-4);
}
