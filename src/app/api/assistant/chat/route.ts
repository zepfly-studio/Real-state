import { NextResponse } from "next/server";
import { assistantContext, isResponse } from "@/lib/leadgen/guard";
import { guarded, bad } from "@/lib/leadgen/respond";
import { llmFor, type ToolCall } from "@/lib/leadgen/llm";
import { accessFor, contextLine, fastPath, prepare, readJson, runReadTool, systemPrompt, toolsFor, WRITE_TOOLS, type Pending } from "@/lib/leadgen/assistant";

const MAX_STEPS = 4; // model ↔ tools round trips per request
const HISTORY = 8; // past turns sent to the model (older ones aren't needed and cost tokens)

/**
 * POST /api/assistant/chat  { messages: [{role, content}], page }
 * CRM-wide assistant. Reads happen immediately; anything that creates, changes or sends something
 * comes back in `pending` for the person to confirm — it is NOT done here.
 */
export async function POST(req: Request) {
  const ctx = await assistantContext();
  if (isResponse(ctx)) return ctx;
  return guarded(async () => {
    const body = await req.json().catch(() => ({}));
    const messages: Array<{ role: string; content: string }> = Array.isArray(body.messages) ? body.messages.slice(-HISTORY) : [];
    if (!messages.length || messages[messages.length - 1].role !== "user") return bad("The last message must be from the user.");
    const page = String(body.page ?? "").slice(0, 120);
    const access = await accessFor(ctx.user.role, ctx.tenantId);

    // Free: plain navigation ("open prospects", "CRM kholo") is answered without calling ChatGPT.
    const quick = fastPath(String(messages[messages.length - 1].content ?? ""), access);
    if (quick) return NextResponse.json({ reply: quick.reply, pending: [], ui: [{ navigate: quick.navigate }], cost: { model_calls: 0 } });

    const llm = await llmFor(ctx.tenantId, systemPrompt(access), toolsFor(access), { maxTokens: 300 });
    messages.forEach((m, i) => {
      if (!llm.messages.length && m.role !== "user") return; // first turn must be the user's
      const content = String(m.content ?? "").slice(0, 2000);
      if (m.role === "user") llm.addUser(i === messages.length - 1 ? `${contextLine(page)} ${content}` : content);
      else if (m.role === "assistant") llm.addAssistantText(content);
    });

    const pending: Pending[] = [];
    const ui: Array<{ navigate: string }> = [];
    let spoken = "";
    for (let step = 0; step < MAX_STEPS; step++) {
      const reply = await llm.step();
      spoken = reply.text || spoken;
      if (!reply.calls.length) break;

      const results: Array<[ToolCall, string]> = [];
      for (const call of reply.calls) {
        if (WRITE_TOOLS.has(call.name)) {
          const r = await prepare(ctx.tenantId, access, call.name, call.args);
          if (r.pending) {
            pending.push(r.pending);
            results.push([call, "Proposed; waiting for the user to confirm."]);
          } else results.push([call, r.problem || "Couldn't prepare that."]);
          continue;
        }
        try {
          const { out, navigate } = await runReadTool(ctx.tenantId, access, call.name, call.args);
          if (navigate) ui.push({ navigate });
          results.push([call, readJson(out)]);
        } catch {
          results.push([call, readJson({ error: "That lookup failed." })]);
        }
      }
      if (pending.length) break; // the person decides before anything else happens
      // A pure navigation needs no second model call to "say" something.
      if (reply.calls.every((c) => c.name === "navigate") && ui.length) {
        spoken = spoken || "Opening it.";
        break;
      }
      llm.addResults(results);
    }

    if (pending.length && !spoken) spoken = "Here's what I'll do. Say yes to confirm, or no to cancel.";
    else if (pending.length) spoken = `${spoken} Say yes to confirm.`;
    return NextResponse.json({ reply: spoken || "Done.", pending, ui, cost: { model_calls: llm.usage.calls, prompt_tokens: llm.usage.prompt, cached_tokens: llm.usage.cached, reply_tokens: llm.usage.completion } });
  });
}
