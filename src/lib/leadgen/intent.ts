import { geminiFor, GeminiNotConnected } from "./gemini";

export interface Brief {
  location: string;
  leadCount: number;
}

/** "find 50 sellers in Downtown Miami" → { location, leadCount } without any AI. */
export function regexBrief(transcript: string): Brief {
  const text = (transcript || "").trim();
  const count = text.match(/\b(\d{1,5})\b/);
  const loc = text.match(
    /\bin\s+([A-Za-z][A-Za-z.'\-\s]{1,50}?)(?=\s+(?:and|with|for|then|to|targeting|area|zip)\b|[.,;!?]|$)/i
  );
  return {
    location: loc ? loc[1].replace(/\s+/g, " ").trim() : "",
    leadCount: count ? parseInt(count[1], 10) : 0,
  };
}

/** Gemini reads the spoken brief; if it's unavailable for any reason the regex reader takes over. */
export async function parseBrief(tenantId: string, transcript: string): Promise<Brief> {
  try {
    const g = await geminiFor(
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
    if (!(e instanceof GeminiNotConnected)) console.warn("[leadgen] Gemini brief parse failed, using fallback");
    return regexBrief(transcript);
  }
}
