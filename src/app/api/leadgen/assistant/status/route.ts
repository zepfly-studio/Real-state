import { NextResponse } from "next/server";
import { getIntegration } from "@/lib/integrations";
import { lgContext, isResponse } from "@/lib/leadgen/guard";
import { LLM_MODEL } from "@/lib/leadgen/llm";

export async function GET() {
  const ctx = await lgContext();
  if (isResponse(ctx)) return ctx;
  const key = await getIntegration(ctx.tenantId, "OPENAI");
  return NextResponse.json(key ? { connected: true, provider: "ChatGPT", model: LLM_MODEL } : { connected: false });
}
