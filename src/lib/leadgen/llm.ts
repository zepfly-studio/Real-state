import { getIntegration } from "@/lib/integrations";

/**
 * Minimal ChatGPT (OpenAI) tool-calling client.
 * The workspace's key is read from Lead Generation → Setup (integration OPENAI, env OPENAI_API_KEY);
 * it never reaches the browser.
 */

const BASE = (process.env.LEADGEN_OPENAI_BASE || "https://api.openai.com/v1").replace(/\/+$/, "");
export const LLM_MODEL = process.env.LEADGEN_OPENAI_MODEL || "gpt-4o-mini";

export class LlmNotConnected extends Error {}

export class LlmError extends Error {
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

/** Cost controls: short replies by default, JSON mode for structured answers. */
export interface LlmOptions {
  json?: boolean;
  maxTokens?: number;
  temperature?: number;
}

function friendly(status: number, body: any): string {
  const m = String(body?.error?.message ?? "").slice(0, 160);
  const code = String(body?.error?.code ?? "");
  if (status === 401) return "ChatGPT rejected the API key. Check it was copied completely (it starts with sk-).";
  if (status === 429 && /quota|billing/i.test(m + code)) return "Your OpenAI account is out of credit. Add billing at platform.openai.com, then try again.";
  if (status === 429) return "ChatGPT is busy or rate-limited. Try again in a minute.";
  if (status === 404) return "ChatGPT doesn't recognise that model.";
  return `ChatGPT returned an error (${status}). ${m}`.trim();
}

export class Llm {
  messages: Msg[] = [];
  /** Token usage of every call made by this client (for cost visibility). */
  usage = { prompt: 0, completion: 0, cached: 0, calls: 0 };
  constructor(private key: string, private system: string, private tools: ToolSpec[] = [], private opts: LlmOptions = {}) {}

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
          model: LLM_MODEL,
          // The system prompt + tool list come first and never change, so OpenAI's automatic
          // prompt caching bills repeat requests at the discounted cached-input rate.
          messages: [{ role: "system", content: this.system }, ...this.messages],
          max_tokens: this.opts.maxTokens ?? 350,
          temperature: this.opts.temperature ?? 0.3,
          ...(this.opts.json ? { response_format: { type: "json_object" } } : {}),
          ...(this.tools.length
            ? { tools: this.tools.map((t) => ({ type: "function", function: { name: t.name, description: t.description, parameters: t.schema } })) }
            : {}),
        }),
        signal: AbortSignal.timeout(60_000),
        cache: "no-store",
      });
    } catch {
      throw new LlmError(502, "Couldn't reach ChatGPT. Check the internet connection.");
    }
    const body: any = await res.json().catch(() => null);
    if (!res.ok) throw new LlmError(res.status === 401 ? 401 : 502, friendly(res.status, body));

    const u = body?.usage ?? {};
    this.usage.prompt += Number(u.prompt_tokens) || 0;
    this.usage.completion += Number(u.completion_tokens) || 0;
    this.usage.cached += Number(u.prompt_tokens_details?.cached_tokens) || 0;
    this.usage.calls += 1;
    const msg = body?.choices?.[0]?.message;
    if (!msg) throw new LlmError(502, "ChatGPT sent an empty answer. Try again.");
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

/** A client for this workspace, or throws LlmNotConnected. */
export async function llmFor(tenantId: string, system: string, tools: ToolSpec[] = [], opts: LlmOptions = {}): Promise<Llm> {
  const key = await getIntegration(tenantId, "OPENAI");
  if (!key) throw new LlmNotConnected();
  return new Llm(key, system, tools, opts);
}

/** Cheap check used by the Setup screen. */
export async function testLlm(tenantId: string): Promise<{ ok: boolean; message: string }> {
  const key = await getIntegration(tenantId, "OPENAI");
  if (!key) return { ok: false, message: "Add your ChatGPT (OpenAI) API key first." };
  if (!key.startsWith("sk-")) {
    return { ok: false, message: "That doesn't look like an OpenAI key (they start with sk-). Get one at platform.openai.com → API keys." };
  }
  try {
    const g = new Llm(key, "Answer with exactly one word.", [], { maxTokens: 5 });
    g.addUser("Say OK.");
    await g.step();
    return { ok: true, message: `Connected to ChatGPT (${LLM_MODEL}). The assistant is ready.` };
  } catch (e) {
    return { ok: false, message: e instanceof LlmError ? e.detail : "Couldn't reach ChatGPT." };
  }
}
