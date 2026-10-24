import { getIntegration } from "@/lib/integrations";

/**
 * Minimal Gemini tool-calling client (Google's OpenAI-compatible endpoint).
 * The tenant's key is read from Settings → Integrations (GEMINI); it never reaches the browser.
 */

const BASE = (process.env.LEADGEN_GEMINI_BASE || "https://generativelanguage.googleapis.com/v1beta/openai").replace(/\/+$/, "");
export const GEMINI_MODEL = process.env.LEADGEN_GEMINI_MODEL || "gemini-2.5-flash";

export class GeminiNotConnected extends Error {}

export class GeminiError extends Error {
  constructor(public status: number, public detail: string) {
    super(detail);
  }
}

export interface ToolSpec {
  name: string;
  description: string;
  schema: { type: "object"; properties: Record<string, unknown>; required?: string[] };
}

export interface ToolCall {
  id: string;
  name: string;
  args: Record<string, any>;
}

type Msg = Record<string, any>;

function friendly(status: number, body: any): string {
  const m = String(body?.error?.message ?? body?.[0]?.error?.message ?? "").slice(0, 160);
  if (status === 400 && /api key/i.test(m)) return "Gemini rejected the API key. Check it was copied completely and the account is active.";
  if (status === 401 || status === 403) return "Gemini rejected the API key. Check it was copied completely and the account is active.";
  if (status === 429) return "Gemini says the account is out of quota or sending too fast. Try again in a minute.";
  if (status === 404) return "Gemini doesn't recognise that model.";
  return `Gemini returned an error (${status}). ${m}`.trim();
}

export class Gemini {
  messages: Msg[] = [];
  constructor(private key: string, private system: string, private tools: ToolSpec[] = []) {}

  addUser(text: string) {
    this.messages.push({ role: "user", content: text });
  }
  addAssistantText(text: string) {
    this.messages.push({ role: "assistant", content: text });
  }
  addResults(results: Array<[ToolCall, string]>) {
    for (const [c, out] of results) this.messages.push({ role: "tool", tool_call_id: c.id, content: out });
  }

  /** Ask the model for its next move and record it in the transcript. */
  async step(): Promise<{ text: string; calls: ToolCall[] }> {
    let res: Response;
    try {
      res = await fetch(`${BASE}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.key}` },
        body: JSON.stringify({
          model: GEMINI_MODEL,
          messages: [{ role: "system", content: this.system }, ...this.messages],
          ...(this.tools.length
            ? {
                tools: this.tools.map((t) => ({
                  type: "function",
                  function: { name: t.name, description: t.description, parameters: t.schema },
                })),
              }
            : {}),
        }),
        signal: AbortSignal.timeout(60_000),
        cache: "no-store",
      });
    } catch {
      throw new GeminiError(502, "Couldn't reach Gemini. Check the internet connection.");
    }
    const body: any = await res.json().catch(() => null);
    if (!res.ok) throw new GeminiError(res.status === 400 || res.status === 401 || res.status === 403 ? 401 : 502, friendly(res.status, body));

    const msg = body?.choices?.[0]?.message;
    if (!msg) throw new GeminiError(502, "Gemini sent an empty answer. Try again.");
    // Keep the provider's own message (including any thought signatures) so tool turns round-trip.
    this.messages.push({ role: "assistant", content: msg.content ?? null, ...(msg.tool_calls ? { tool_calls: msg.tool_calls } : {}) });

    const calls: ToolCall[] = (msg.tool_calls ?? []).map((tc: any) => {
      let args: any = {};
      try {
        args = JSON.parse(tc?.function?.arguments || "{}");
      } catch {
        args = {};
      }
      return { id: tc.id || tc?.function?.name || "", name: tc?.function?.name || "", args: args && typeof args === "object" ? args : {} };
    });
    return { text: String(msg.content ?? "").trim(), calls };
  }
}

/** A client for this tenant, or throws GeminiNotConnected. */
export async function geminiFor(tenantId: string, system: string, tools: ToolSpec[] = []): Promise<Gemini> {
  const key = await getIntegration(tenantId, "GEMINI");
  if (!key) throw new GeminiNotConnected();
  return new Gemini(key, system, tools);
}

/** Cheap check used by the Setup screen. */
export async function testGemini(tenantId: string): Promise<{ ok: boolean; message: string }> {
  const key = await getIntegration(tenantId, "GEMINI");
  if (!key) return { ok: false, message: "Add your Gemini API key first." };
  if (!key.startsWith("AIza")) {
    return { ok: false, message: "That doesn't look like a Gemini key (they start with AIza). Get one at aistudio.google.com." };
  }
  try {
    const g = new Gemini(key, "Answer with exactly one word.");
    g.addUser("Say OK.");
    await g.step();
    return { ok: true, message: `Connected to Gemini (${GEMINI_MODEL}). The assistant is ready.` };
  } catch (e) {
    return { ok: false, message: e instanceof GeminiError ? e.detail : "Couldn't reach Gemini." };
  }
}
