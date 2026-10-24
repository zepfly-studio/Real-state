import { NextResponse } from "next/server";
import { getIntegration } from "@/lib/integrations";
import { assistantContext, isResponse } from "@/lib/leadgen/guard";
import { LLM_MODEL } from "@/lib/leadgen/llm";

export async function GET() {
  const ctx = await assistantContext();
  if (isResponse(ctx)) return ctx;
  const key = await getIntegration(ctx.tenantId, "OPENAI");
  return NextResponse.json(key ? { connected: true, provider: "ChatGPT", model: LLM_MODEL } : { connected: false });
}
