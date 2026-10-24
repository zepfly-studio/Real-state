import { NextResponse } from "next/server";
import { lgContext, isResponse } from "@/lib/leadgen/guard";
import { guarded, bad } from "@/lib/leadgen/respond";
import { llmFor, type ToolCall } from "@/lib/leadgen/llm";
import { prepare, readJson, runReadTool, systemPrompt, TOOLS, WRITE_TOOLS, type Pending } from "@/lib/leadgen/assistant";

const MAX_STEPS = 6;

/**
 * POST /api/leadgen/assistant/chat  { messages: [{role, content}], page }
 * Runs ChatGPT with the tools. Reads happen immediately; anything that sends, spends or
 * changes data comes back in `pending` for the person to confirm — it is NOT done here.
 */
export async function POST(req: Request) {
  const ctx = await lgContext();
  if (isResponse(ctx)) return ctx;
  return guarded(async () => {
    const body = await req.json().catch(() => ({}));
    const messages: Array<{ role: string; content: string }> = Array.isArray(body.messages) ? body.messages.slice(-16) : [];
    if (!messages.length || messages[messages.length - 1].role !== "user") return bad("The last message must be from the user.");

    const g = await llmFor(ctx.tenantId, systemPrompt(String(body.page ?? "").slice(0, 120)), TOOLS);
    for (const m of messages) {
      if (!g.messages.length && m.role !== "user") continue; // the first turn must be the user's
      const content = String(m.content ?? "").slice(0, 4000);
      if (m.role === "user") g.addUser(content);
      else if (m.role === "assistant") g.addAssistantText(content);
    }

    const pending: Pending[] = [];
    const ui: Array<{ navigate: string }> = [];
    let spoken = "";

    for (let step = 0; step < MAX_STEPS; step++) {
      const reply = await g.step();
      spoken = reply.text || spoken;
      if (!reply.calls.length) break;

      const results: Array<[ToolCall, string]> = [];
      for (const call of reply.calls) {
        if (WRITE_TOOLS.has(call.name)) {
          const r = await prepare(ctx.tenantId, call.name, call.args);
          if (r.pending) {
            pending.push(r.pending);
            results.push([call, "Proposed. Waiting for the person to confirm."]);
          } else {
            results.push([call, r.problem || "Couldn't prepare that."]);
          }
          continue;
        }
        try {
          const { out, navigate } = await runReadTool(ctx.tenantId, call.name, call.args);
          if (navigate) ui.push({ navigate });
          results.push([call, readJson(out)]);
        } catch (e) {
          results.push([call, readJson({ error: "That lookup failed." })]);
        }
      }
      if (pending.length) break; // stop here: the person decides before anything else happens
      g.addResults(results);
    }

    if (pending.length && !spoken) spoken = "I've got that ready. Say yes to confirm, or no to cancel.";
    else if (pending.length) spoken = `${spoken} Say yes to confirm.`;
    return NextResponse.json({ reply: spoken || "Done.", pending, ui });
  });
}
