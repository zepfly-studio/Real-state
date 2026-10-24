/**
 * Lead-generation pipeline stages. Replies decide the outcome (a person marks a
 * lead Interested / Not interested, or the assistant does) — there is no calling.
 */
export const LG_STAGES = ["SCRAPED", "EMAIL_SENT", "WHATSAPP_SENT", "HOT_LEAD", "UNQUALIFIED"] as const;
export type LgStage = (typeof LG_STAGES)[number];

export interface StageMeta {
  label: string;
  rank: number;
  tone: "neutral" | "blue" | "purple" | "green" | "red" | "gold";
  bar: string;
}

export const STAGE_META: Record<LgStage, StageMeta> = {
  SCRAPED: { label: "New", rank: 0, tone: "neutral", bar: "var(--txt-faint)" },
  EMAIL_SENT: { label: "Emailed", rank: 1, tone: "blue", bar: "var(--blue)" },
  WHATSAPP_SENT: { label: "Messaged", rank: 2, tone: "purple", bar: "var(--purple)" },
  HOT_LEAD: { label: "Interested", rank: 3, tone: "green", bar: "var(--green)" },
  UNQUALIFIED: { label: "Not interested", rank: 3, tone: "red", bar: "var(--red)" },
};

export function stageMeta(value?: string | null): StageMeta {
  return STAGE_META[value as LgStage] ?? { label: value || "Unknown", rank: 0, tone: "neutral", bar: "var(--txt-faint)" };
}

/** Rank used for "has at least reached stage X" counts: anything past EMAIL_SENT has been messaged. */
export const REACHED_EMAIL = ["EMAIL_SENT", "WHATSAPP_SENT", "HOT_LEAD", "UNQUALIFIED"];
export const REACHED_WHATSAPP = ["WHATSAPP_SENT", "HOT_LEAD", "UNQUALIFIED"];

export const EVENT_LABEL: Record<string, string> = {
  campaign_launched: "Campaign started",
  lead_scraped: "New lead found",
  status_change: "Lead advanced",
  whatsapp_message: "Message",
  n8n_dispatch: "Automation started",
  n8n_dispatch_failed: "Automation not running",
  send_failed: "Message not delivered",
  lead_search_done: "Sellers found",
  lead_search_empty: "No sellers found",
  lead_search_failed: "Lead search failed",
};

/** Phone numbers match on their last 10 digits (+91 / 0 / spaces vary). */
export function phoneKey(input?: string | null): string {
  return String(input ?? "").replace(/\D/g, "").slice(-10);
}
