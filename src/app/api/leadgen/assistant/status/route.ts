import { NextResponse } from "next/server";
import { getIntegration } from "@/lib/integrations";
import { lgContext, isResponse } from "@/lib/leadgen/guard";
import { GEMINI_MODEL } from "@/lib/leadgen/gemini";

export async function GET() {
  const ctx = await lgContext();
  if (isResponse(ctx)) return ctx;
  const key = await getIntegration(ctx.tenantId, "GEMINI");
  return NextResponse.json(key ? { connected: true, provider: "Gemini", model: GEMINI_MODEL } : { connected: false });
}
