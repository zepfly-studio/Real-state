import { llmFor, LlmNotConnected } from "./llm";
import { JAIPUR_AREAS } from "@/lib/format";

export interface Brief {
  location: string;
  leadCount: number;
}

/**
 * "find 50 sellers in Mansarovar" / "Jagatpura mein 40 sellers dhundo" → { location, leadCount } without any AI.
 * Used when ChatGPT isn't connected; the person always reviews the result before launching.
 */
export function regexBrief(transcript: string): Brief {
  const text = (transcript || "").trim();
  const count = text.match(/\b(\d{1,5})\b/);
  const english = text.match(
    /\bin\s+([A-Za-z][A-Za-z.'\-\s]{1,50}?)(?=\s+(?:and|with|for|then|to|targeting|area|zip)\b|[.,;!?]|$)/i
  );
  // Hinglish: "<Place> mein / me / main ..."
  const hinglish = text.match(/([A-Z][A-Za-z.'\-]*(?:\s+[A-Z][A-Za-z.'\-]*){0,3})\s+(?:mein|me|main)\b/);
  const known = JAIPUR_AREAS.find((a) => text.toLowerCase().includes(a.toLowerCase()));
  const location = (english?.[1] ?? hinglish?.[1] ?? known ?? "").replace(/\s+/g, " ").trim();
  return { location, leadCount: count ? parseInt(count[1], 10) : 0 };
}

/** ChatGPT reads the spoken brief; if it's unavailable for any reason the regex reader takes over. */
export async function parseBrief(tenantId: string, transcript: string): Promise<Brief> {
  try {
    const g = await llmFor(
      tenantId,
      "Extract campaign parameters from a spoken brief. " +
        'Reply with ONLY valid JSON: {"location": string, "lead_count": number}. ' +
        "If a value is absent use an empty string or 0."
    );
    g.addUser(transcript);
    const { text } = await g.step();
    const found = text.match(/\{[\s\S]*\}/);
    const data = found ? JSON.parse(found[0]) : {};
    const n = Math.round(Number(data.lead_count));
    return { location: String(data.location ?? "").trim(), leadCount: Number.isFinite(n) && n > 0 ? Math.min(n, 5000) : 0 };
  } catch (e) {
    if (!(e instanceof LlmNotConnected)) console.warn("[leadgen] ChatGPT brief parse failed, using fallback");
    return regexBrief(transcript);
  }
}
