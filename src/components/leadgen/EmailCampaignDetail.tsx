"use client";
import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import { EmptyState } from "@/components/ui";
import { ApiError, ConnectCard, Field, lg, Modal, Segmented, Skeleton, Spinner, useLg, useToast, num } from "./kit";
import { StatusActions, StatusPill, type EmailCampaign } from "./EmailCampaignsClient";

type Tab = "analytics" | "leads" | "emails";
interface Progress { total: number; completed: number; in_progress: number; not_started: number; blocked: number; paused: number; stopped: number }
type Camp = EmailCampaign & { unsubscribed: number; progress: Progress; has_analytics: boolean };

export function EmailCampaignDetail({ id }: { id: number }) {
  const q = useLg<Camp>(`/email/campaigns/${id}`, 60_000);
  const [tab, setTab] = useState<Tab>("analytics");
  if (q.notConnected) return <ConnectCard icon="MailPlus" title="Connect Smartlead first" cta="Go to Setup">Add your Smartlead key once and this campaign appears here.</ConnectCard>;
  if (q.error && !q.data) return <p className="text-sm text-red">{q.error.message}</p>;
  const c = q.data;
  if (q.loading || !c) return <div className="space-y-3"><Skeleton className="h-16" /><Skeleton className="h-40" /></div>;

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="min-w-0">
          <div className="flex items-center gap-3"><h2 className="font-display text-2xl font-bold truncate">{c.name}</h2><StatusPill status={c.status} /></div>
          <p className="text-sm text-txt-dim mt-0.5">Campaign #{c.id} · {num(c.leads)} leads · {num(c.sent)} emails sent</p>
        </div>
        <div className="ml-auto"><StatusActions id={c.id} status={c.status} onDone={q.refresh} size="md" /></div>
      </div>
      <div className="mb-5"><Segmented label="Campaign sections" value={tab} onChange={setTab} options={[{ value: "analytics", label: "Analytics" }, { value: "leads", label: "Leads" }, { value: "emails", label: "Emails" }]} /></div>
      {tab === "analytics" && <Analytics c={c} />}
      {tab === "leads" && <Leads id={id} onAdded={q.refresh} />}
      {tab === "emails" && <Sequences id={id} />}
    </>
  );
}

function Analytics({ c }: { c: Camp }) {
  const tiles: Array<[string, number, string, string]> = [
    ["Sent", c.sent, "Send", ""],
    ["Opened", c.opened, "MailOpen", `${c.open_rate}%`],
    ["Clicked", c.clicked, "MousePointerClick", `${c.click_rate}%`],
    ["Replied", c.replied, "Reply", `${c.reply_rate}%`],
    ["Positive", c.positive, "ThumbsUp", "interested"],
    ["Bounced", c.bounced, "Ban", `${c.bounce_rate}%`],
    ["Unsubscribed", c.unsubscribed, "UserMinus", ""],
  ];
  const p = c.progress;
  const done = p.total ? Math.round((p.completed * 100) / p.total) : 0;
  const parts: Array<[string, number, string]> = [["Completed", p.completed, "var(--green)"], ["In progress", p.in_progress, "var(--blue)"], ["Not started", p.not_started, "var(--txt-faint)"], ["Paused", p.paused, "var(--gold)"], ["Blocked", p.blocked, "var(--red)"], ["Stopped", p.stopped, "var(--red)"]];
  return (
    <>
      {!c.has_analytics && <p className="card border-dashed p-4 text-sm text-txt-dim mb-4">Smartlead hasn&apos;t reported analytics for this campaign yet — numbers appear once it starts sending.</p>}
      <section className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3 mb-5">
        {tiles.map(([label, value, icon, sub]) => (
          <div key={label} className="card p-4">
            <div className="flex items-center justify-between text-txt-faint"><span className="text-[11px] uppercase tracking-wide font-semibold">{label}</span><Icon name={icon} size={15} /></div>
            <div className="font-display text-2xl font-bold mt-1.5">{num(value)}</div>
            <div className="text-[11px] text-txt-dim mt-1">{sub || " "}</div>
          </div>
        ))}
      </section>
      <div className="card p-5">
        <div className="flex items-baseline justify-between mb-3"><h3 className="font-display font-bold">Lead progress</h3><span className="text-sm text-txt-dim">{done}% complete</span></div>
        <div className="flex h-3 w-full overflow-hidden rounded-full bg-panel-2" role="img" aria-label="Lead progress">
          {parts.map(([k, v, color]) => v > 0 && <div key={k} style={{ width: `${(v * 100) / Math.max(p.total, 1)}%`, background: color }} title={`${k}: ${v}`} />)}
        </div>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-txt-dim">
          {parts.map(([k, v, color]) => <span key={k} className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: color }} />{k} <b className="text-txt tabular-nums">{num(v)}</b></span>)}
        </div>
      </div>
    </>
  );
}

interface SLead { map_id: number | null; email: string; first_name: string; last_name: string; company: string; location: string; status: string; unsubscribed: boolean }

function Leads({ id, onAdded }: { id: number; onAdded: () => void }) {
  const [filter, setFilter] = useState("");
  const [offset, setOffset] = useState(0);
  const [adding, setAdding] = useState(false);
  const q = useLg<{ total: number; leads: SLead[] }>(`/email/campaigns/${id}/leads?offset=${offset}&limit=50${filter ? `&email_status=${filter}` : ""}`);
  const total = q.data?.total ?? 0;
  return (
    <>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <Segmented label="Filter leads" value={filter} onChange={(v) => (setFilter(v), setOffset(0))} options={[{ value: "", label: "All" }, { value: "is_opened", label: "Opened" }, { value: "is_replied", label: "Replied" }, { value: "is_bounced", label: "Bounced" }, { value: "not_replied", label: "Not replied" }]} />
        <button className="btn btn-primary ml-auto" onClick={() => setAdding(true)}><Icon name="UserPlus" size={15} /> Add leads</button>
      </div>
      <div className="card overflow-hidden">
        {q.loading ? <div className="p-5"><Skeleton className="h-24" /></div> : q.error ? <p className="p-5 text-sm text-red">{q.error.message}</p> : !q.data?.leads.length ? (
          <EmptyState icon="Users" title="No leads here" hint="Add leads and Smartlead starts emailing them once the campaign is running." action={<button className="btn btn-primary" onClick={() => setAdding(true)}><Icon name="UserPlus" size={15} /> Add leads</button>} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-line text-left text-xs text-txt-faint font-semibold uppercase tracking-wide"><th className="py-3 pl-5 pr-4">Lead</th><th className="py-3 pr-4">Company</th><th className="py-3 pr-4">Location</th><th className="py-3 pr-5">Status</th></tr></thead>
              <tbody>
                {q.data.leads.map((l, i) => (
                  <tr key={l.map_id ?? i} className="border-b border-line/40">
                    <td className="py-2.5 pl-5 pr-4"><div className="font-semibold">{[l.first_name, l.last_name].filter(Boolean).join(" ") || l.email}</div><div className="text-xs text-txt-dim">{l.email}</div></td>
                    <td className="py-2.5 pr-4 text-txt-dim">{l.company || "—"}</td>
                    <td className="py-2.5 pr-4 text-txt-dim">{l.location || "—"}</td>
                    <td className="py-2.5 pr-5"><span className="tag bg-panel-2 text-txt-dim">{l.unsubscribed ? "Unsubscribed" : l.status || "—"}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {total > 50 && (
          <div className="flex items-center justify-between border-t border-line px-5 py-3 text-sm text-txt-dim">
            <span>{offset + 1}–{Math.min(offset + 50, total)} of {num(total)}</span>
            <div className="flex gap-2"><button className="btn !py-1.5" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - 50))}>Prev</button><button className="btn !py-1.5" disabled={offset + 50 >= total} onClick={() => setOffset(offset + 50)}>Next</button></div>
          </div>
        )}
      </div>
      <AddLeads id={id} open={adding} onClose={() => setAdding(false)} onDone={() => (setAdding(false), q.refresh(), onAdded())} />
    </>
  );
}

const HEADER = /^email$/i;
function parseCsv(text: string) {
  const out: Array<Record<string, string>> = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const cells = line.split(/[,\t;]/).map((c) => c.trim().replace(/^"|"$/g, ""));
    if (HEADER.test(cells[0])) continue; // header row
    out.push({ email: cells[0], first_name: cells[1] ?? "", last_name: cells[2] ?? "", company_name: cells[3] ?? "", location: cells[4] ?? "" });
  }
  return out;
}

function AddLeads({ id, open, onClose, onDone }: { id: number; open: boolean; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const rows = parseCsv(text);
  async function submit() {
    if (!rows.length) return setErr("Paste at least one email address.");
    setBusy(true);
    setErr(null);
    try {
      const r = await lg<{ added: number; skipped: number }>(`/email/campaigns/${id}/leads`, { body: { leads: rows } });
      toast.success(`${r.added} lead${r.added === 1 ? "" : "s"} added`, r.skipped ? `${r.skipped} skipped (duplicates or blocked).` : undefined);
      setText("");
      onDone();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Couldn't add the leads.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal open={open} onClose={onClose} title="Add leads" subtitle="One per line: email, first name, last name, company, location. Only the email is required." wide>
      <Field label="Paste leads" error={err} hint={rows.length ? `${rows.length} lead${rows.length === 1 ? "" : "s"} ready` : "Up to 400 at a time."}>
        <textarea className="input font-mono text-[13px]" rows={8} value={text} onChange={(e) => setText(e.target.value)} placeholder={"priya@example.com, Priya, Sharma, Shubh Realtors, Jaipur\nrahul@example.com"} />
      </Field>
      <div className="mt-4 flex justify-end gap-2"><button className="btn" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={submit} disabled={busy || !rows.length}>{busy ? <Spinner /> : null} Add {rows.length || ""} lead{rows.length === 1 ? "" : "s"}</button></div>
    </Modal>
  );
}

interface Step { seq_number: number; subject: string; body: string; delay_days: number; variants: number; editable: boolean }

function Sequences({ id }: { id: number }) {
  const toast = useToast();
  const q = useLg<{ steps: Step[] }>(`/email/campaigns/${id}/sequences`);
  const [steps, setSteps] = useState<Step[]>([]);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (q.data) setSteps(q.data.steps.length ? q.data.steps : [{ seq_number: 1, subject: "", body: "", delay_days: 0, variants: 0, editable: true }]); }, [q.data]);
  const locked = steps.some((s) => !s.editable);
  const set = (i: number, patch: Partial<Step>) => setSteps((x) => x.map((s, j) => (j === i ? { ...s, ...patch } : s)));

  async function save() {
    setBusy(true);
    try {
      await lg(`/email/campaigns/${id}/sequences`, { method: "PUT", body: { steps: steps.map((s, i) => ({ seq_number: i + 1, subject: s.subject, body: s.body, delay_days: s.delay_days })) } });
      toast.success("Emails saved", "Smartlead will use these from the next send.");
      q.refresh();
    } catch (e) {
      toast.error("Couldn't save the emails", e instanceof ApiError ? e.message : undefined);
    } finally {
      setBusy(false);
    }
  }

  if (q.loading) return <Skeleton className="h-40" />;
  if (q.error && !q.data) return <p className="text-sm text-red">{q.error.message}</p>;
  return (
    <div className="space-y-4">
      {locked && <p className="card border-dashed p-4 text-sm text-txt-dim">This campaign uses A/B variants. Edit those emails in Smartlead so nothing is lost.</p>}
      {steps.map((s, i) => (
        <div key={i} className="card p-5">
          <div className="flex items-center gap-3 mb-3">
            <span className="grid h-7 w-7 place-items-center rounded-full bg-gold-soft text-gold-bright text-sm font-bold">{i + 1}</span>
            <h4 className="font-display font-bold">{i === 0 ? "First email" : `Follow-up ${i}`}</h4>
            {i > 0 && <label className="ml-auto flex items-center gap-2 text-sm text-txt-dim">Wait <input type="number" min={0} max={60} className="input !w-16 !py-1.5" value={s.delay_days} disabled={locked} onChange={(e) => set(i, { delay_days: Math.max(0, Math.min(60, Number(e.target.value) || 0)) })} /> days</label>}
            {i > 0 && !locked && <button className="text-txt-faint hover:text-red" onClick={() => setSteps((x) => x.filter((_, j) => j !== i))} aria-label="Remove this email"><Icon name="Trash2" size={16} /></button>}
          </div>
          <div className="space-y-3">
            <Field label="Subject"><input className="input" value={s.subject} disabled={locked} onChange={(e) => set(i, { subject: e.target.value })} placeholder="Subject line" /></Field>
            <Field label="Message" hint="Use {{first_name}} to personalise."><textarea className="input" rows={6} value={s.body} disabled={locked} onChange={(e) => set(i, { body: e.target.value })} /></Field>
          </div>
        </div>
      ))}
      {!locked && (
        <div className="flex items-center gap-2">
          {steps.length < 10 && <button className="btn" onClick={() => setSteps((x) => [...x, { seq_number: x.length + 1, subject: "", body: "", delay_days: 3, variants: 0, editable: true }])}><Icon name="Plus" size={15} /> Add follow-up</button>}
          <button className="btn btn-primary ml-auto" onClick={save} disabled={busy || steps.some((s) => !s.body.trim())}>{busy ? <Spinner /> : <Icon name="Save" size={15} />} Save emails</button>
        </div>
      )}
    </div>
  );
}
