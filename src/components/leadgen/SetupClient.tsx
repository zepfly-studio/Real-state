"use client";
import { useState } from "react";
import { Icon } from "@/components/Icon";
import { ApiError, Field, lg, Skeleton, Spinner, useLg, useToast } from "./kit";

interface SField { name: string; tool: string; label: string; secret: boolean; placeholder: string; help: string; configured: boolean; value: string; preview: string }
interface Setup { fields: SField[]; token: string | null; urls: { sync: string; leads: string; crm: string } }

const TOOLS: Array<{ id: string; title: string; icon: string; blurb: string; unlocks: string }> = [
  { id: "smartlead", title: "Smartlead", icon: "Mail", blurb: "Cold-email campaigns, mailboxes, replies and analytics.", unlocks: "Email Campaigns, Mailboxes and email replies in the Inbox" },
  { id: "whatsapp", title: "WhatsApp (Evolution / CloudStation)", icon: "MessageCircle", blurb: "WhatsApp chats, AI auto-replies and manual messages.", unlocks: "WhatsApp chats in the Inbox, and sending replies" },
  { id: "gemini", title: "Google Gemini", icon: "Sparkles", blurb: "Powers the voice assistant (Shift + D) and reads spoken campaign briefs.", unlocks: "The assistant that drafts replies, launches campaigns and runs the section for you" },
  { id: "n8n", title: "n8n automation", icon: "Workflow", blurb: "Finds sellers and sends the first email and WhatsApp messages.", unlocks: "Launching campaigns from the Overview" },
];

function CopyRow({ label, value }: { label: string; value: string }) {
  const [done, setDone] = useState(false);
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-semibold">{label}</div>
        <div className="mt-0.5 break-all font-mono text-xs text-txt-dim">{value}</div>
      </div>
      <button className="btn !py-1.5 !px-3 text-[13px]" onClick={() => navigator.clipboard?.writeText(value).then(() => (setDone(true), setTimeout(() => setDone(false), 1500)))}>
        <Icon name={done ? "Check" : "Copy"} size={14} /> {done ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

export function SetupClient() {
  const q = useLg<Setup>("/setup");
  const toast = useToast();
  const [vals, setVals] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [res, setRes] = useState<Record<string, { ok: boolean; message: string }>>({});
  const [tokenBusy, setTokenBusy] = useState(false);

  if (q.error && !q.data) return <p className="text-sm text-red">{q.error.message}</p>;
  if (q.loading || !q.data) return <div className="space-y-4"><Skeleton className="h-40" /><Skeleton className="h-40" /></div>;
  const d = q.data;

  async function saveAndTest(tool: string) {
    setBusy(tool);
    try {
      for (const f of d.fields.filter((x) => x.tool === tool)) {
        const v = (vals[f.name] ?? "").trim();
        if (!v) continue; // blank keeps what's saved
        const r = await fetch("/api/integrations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: f.name, value: v }) });
        if (!r.ok) throw new ApiError(r.status, (await r.json().catch(() => null))?.error || "Couldn't save that.");
      }
      setVals((x) => Object.fromEntries(Object.entries(x).filter(([k]) => d.fields.find((f) => f.name === k)?.tool !== tool)));
      const t = await lg<{ ok: boolean; message: string }>("/setup/test", { body: { tool } });
      setRes((x) => ({ ...x, [tool]: t }));
      t.ok ? toast.success(`${TOOLS.find((x) => x.id === tool)?.title} connected`, t.message) : toast.error("Saved, but the test failed", t.message);
      q.refresh();
    } catch (e) {
      toast.error("Couldn't save", e instanceof ApiError ? e.message : undefined);
    } finally {
      setBusy(null);
    }
  }

  async function disconnect(tool: string) {
    setBusy(tool);
    try {
      for (const f of d.fields.filter((x) => x.tool === tool)) {
        await fetch("/api/integrations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: f.name, value: "" }) });
      }
      setRes((x) => ({ ...x, [tool]: undefined as never }));
      toast.success("Disconnected", "Saved keys were removed from the CRM.");
      q.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function newToken() {
    setTokenBusy(true);
    try {
      await lg("/setup", { method: "POST", body: {} });
      q.refresh();
      toast.success(d.token ? "New token created" : "Token created", d.token ? "Update it in n8n — the old one stopped working." : "Copy it into the n8n credential.");
    } catch (e) {
      toast.error("Couldn't create the token", e instanceof ApiError ? e.message : undefined);
    } finally {
      setTokenBusy(false);
    }
  }

  const connected = (tool: string) => d.fields.filter((f) => f.tool === tool).every((f) => f.configured);

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="card p-4 flex gap-3 text-[13px] leading-relaxed text-txt-dim">
        <span className="text-gold-bright mt-0.5"><Icon name="ShieldCheck" size={17} /></span>
        <p>Keys are stored per workspace and never shown again — only the last four characters. Your team uses this CRM without ever seeing, or needing, these tools&apos; own logins.</p>
      </div>

      {TOOLS.map((t) => {
        const fields = d.fields.filter((f) => f.tool === t.id);
        const ok = connected(t.id);
        const r = res[t.id];
        return (
          <section key={t.id} className="card p-5" aria-label={t.title}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gold-soft text-gold-bright"><Icon name={t.icon} size={19} /></span>
                <div><h3 className="font-display font-bold">{t.title}</h3><p className="text-[13px] text-txt-dim">{t.blurb}</p></div>
              </div>
              <span className={`tag ${ok ? "bg-[rgba(62,199,141,.14)] text-green" : "bg-panel-2 text-txt-dim"}`}>{ok ? "Saved" : "Not connected"}</span>
            </div>
            <p className="mt-3 text-xs text-txt-faint"><b className="text-txt-dim">Unlocks:</b> {t.unlocks}</p>
            <form className="mt-4 grid gap-4 sm:grid-cols-2" onSubmit={(e) => (e.preventDefault(), saveAndTest(t.id))}>
              {fields.map((f) => (
                <div key={f.name} className={f.name.endsWith("_URL") || f.name === "N8N_WEBHOOK" ? "sm:col-span-2" : ""}>
                  <Field label={f.label} hint={f.secret && f.configured ? `Saved ${f.preview}. Type a new value to replace it.` : f.help}>
                    <input
                      className="input"
                      type={f.secret ? "password" : "text"}
                      autoComplete="off"
                      spellCheck={false}
                      value={vals[f.name] ?? (f.secret ? "" : f.value)}
                      onChange={(e) => setVals({ ...vals, [f.name]: e.target.value })}
                      placeholder={f.secret && f.configured ? "••••••••••••" : f.placeholder}
                    />
                  </Field>
                </div>
              ))}
              {r && (
                <div role="status" className={`sm:col-span-2 flex gap-2.5 rounded-lg px-3.5 py-3 text-[13px] ${r.ok ? "bg-[rgba(62,199,141,.12)] text-green" : "bg-[rgba(240,85,106,.12)] text-red"}`}>
                  <Icon name={r.ok ? "CircleCheck" : "CircleAlert"} size={16} /> <span>{r.message}</span>
                </div>
              )}
              <div className="sm:col-span-2 flex items-center gap-2">
                <button className="btn btn-primary" disabled={busy !== null}>{busy === t.id ? <Spinner /> : null} {fields.some((f) => (vals[f.name] ?? "").trim()) ? "Save & test" : "Test connection"}</button>
                {ok && <button type="button" className="btn" disabled={busy !== null} onClick={() => disconnect(t.id)}>Disconnect</button>}
              </div>
            </form>
          </section>
        );
      })}

      <section className="card p-5" aria-label="Connect n8n to this CRM">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gold-soft text-gold-bright"><Icon name="KeyRound" size={19} /></span>
          <div className="flex-1"><h3 className="font-display font-bold">Connect n8n → this CRM</h3><p className="text-[13px] text-txt-dim">n8n reports leads, messages and status changes back using these. Put them in the n8n workflow once (see the setup guide).</p></div>
          <button className="btn" onClick={newToken} disabled={tokenBusy}>{tokenBusy ? <Spinner /> : <Icon name="RefreshCw" size={14} />} {d.token ? "Rotate token" : "Create token"}</button>
        </div>
        <div className="card mt-4 divide-y divide-line-soft">
          <CopyRow label="CRM address (base URL)" value={d.urls.crm} />
          <CopyRow label="Sync URL — n8n posts events here" value={d.urls.sync} />
          <CopyRow label="Leads URL — n8n asks for leads to contact" value={d.urls.leads} />
          {d.token ? <CopyRow label="Workspace token — header X-Leadgen-Token" value={d.token} /> : <div className="px-4 py-3 text-sm text-txt-dim">Press “Create token” to generate the secret n8n sends with every request.</div>}
        </div>
      </section>
    </div>
  );
}
