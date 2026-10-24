import { NextResponse } from "next/server";
import { SmartleadError, SmartleadNotConnected } from "./smartlead";
import { WhatsAppError, WhatsAppNotConnected } from "./evolution";
import { LlmError, LlmNotConnected } from "./llm";

/**
 * Run a route body and turn the integration errors into clean, plain-language JSON.
 * "Not connected" is a normal state (409 + code), never a crash.
 */
export async function guarded(fn: () => Promise<NextResponse | unknown>): Promise<NextResponse> {
  try {
    const out = await fn();
    return out instanceof NextResponse ? out : NextResponse.json(out);
  } catch (e) {
    if (e instanceof SmartleadNotConnected)
      return NextResponse.json({ code: "smartlead_not_connected", error: "Connect Smartlead under Lead Generation → Setup to see email data." }, { status: 409 });
    if (e instanceof SmartleadError)
      return NextResponse.json({ error: e.detail }, { status: [401, 404, 422, 429].includes(e.status) ? e.status : 502 });
    if (e instanceof WhatsAppNotConnected)
      return NextResponse.json({ code: "whatsapp_not_connected", error: "Connect WhatsApp under Lead Generation → Setup first." }, { status: 409 });
    if (e instanceof WhatsAppError)
      return NextResponse.json({ error: e.detail }, { status: [401, 409, 422].includes(e.status) ? e.status : 502 });
    if (e instanceof LlmNotConnected)
      return NextResponse.json({ code: "assistant_not_connected", error: "Add your ChatGPT (OpenAI) API key under Lead Generation → Setup to switch the assistant on." }, { status: 409 });
    if (e instanceof LlmError) return NextResponse.json({ error: e.detail }, { status: e.status === 401 ? 401 : 502 });
    console.error("[leadgen]", e);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}

export const bad = (message: string, status = 422) => NextResponse.json({ error: message }, { status });
