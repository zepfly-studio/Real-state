"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";
import { EmptyState } from "@/components/ui";
import { ApiError, ConnectCard, Field, lg, Modal, Segmented, Skeleton, Spinner, timeAgoIso, useLg, useToast, num } from "./kit";

export interface EmailCampaign {
  id: number;
  name: string;
  status: string;
  created_at: string | null;
  leads: number;
  sent: number;
  opened: number;
  clicked: number;
  replied: number;
  positive: number;
  bounced: number;
  open_rate: number;
  click_rate: number;
  reply_rate: number;
  bounce_rate: number;
}
interface Totals extends Omit<EmailCampaign, "id" | "name" | "status" | "created_at"> { campaigns: number; active: number }

export const STATUS_UI: Record<string, { label: string; cls: string }> = {
  ACTIVE: { label: "Active", cls: "bg-[rgba(62,199,141,.14)] text-green" },
  PAUSED: { label: "Paused", cls: "bg-gold-soft text-gold-bright" },
  DRAFTED: { label: "Draft", cls: "bg-panel-2 text-txt-dim" },
  DRAFT: { label: "Draft", cls: "bg-panel-2 text-txt-dim" },
  STOPPED: { label: "Stopped", cls: "bg-[rgba(240,85,106,.14)] text-red" },
  COMPLETED: { label: "Completed", cls: "bg-[rgba(91,141,239,.14)] text-blue" },
};
export const StatusPill = ({ status }: { status: string }) => {
  const s = STATUS_UI[status] ?? { label: status, cls: "bg-panel-2 text-txt-dim" };
  return <span className={`tag ${s.cls}`}>{s.label}</span>;
};

/** Start / Pause / Stop buttons for one campaign (stop asks first). */
export function StatusActions({ id, status, onDone, size = "sm" }: { id: number; status: string; onDone: () => void; size?: "sm" | "md" }) {
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  async function act(action: "start" | "pause" | "stop") {
    setBusy(action);
    try {
      await lg(`/email/campaigns/${id}/status`, { body: { action } });
      toast.success(action === "start" ? "Campaign started" : action === "pause" ? "Campaign paused" : "Campaign stopped");
      onDone();
    } catch (e) {
      toast.error("Couldn't change the campaign", e instanceof ApiError ? e.message : undefined);
    } finally {
      setBusy(null);
      setConfirm(false);
    }
  }
  const pad = size === "sm" ? "!py-1.5 !px-3 text-[13px]" : "";
  return (
    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
      {status !== "ACTIVE" && status !== "COMPLETED" && status !== "STOPPED" && (
        <button className={`btn btn-primary ${pad}`} disabled={busy !== null} onClick={() => act("start")}>{busy === "start" ? <Spinner /> : <Icon name="Play" size={14} />} {status === "PAUSED" ? "Resume" : "Start"}</button>
      )}
      {status === "STOPPED" && <button className={`btn ${pad}`} disabled={busy !== null} onClick={() => act("start")}>{busy === "start" ? <Spinner /> : <Icon name="Play" size={14} />} Restart</button>}
      {status === "ACTIVE" && <button className={`btn ${pad}`} disabled={busy !== null} onClick={() => act("pause")}>{busy === "pause" ? <Spinner /> : <Icon name="Pause" size={14} />} Pause</button>}
      {(status === "ACTIVE" || status === "PAUSED") && <button className={`btn ${pad}`} disabled={busy !== null} onClick={() => setConfirm(true)} aria-label="Stop campaign"><Icon name="Square" size={14} /></button>}
      <Modal open={confirm} onClose={() => setConfirm(false)} title="Stop this campaign?" subtitle="Smartlead stops sending to everyone in it. You can restart it later.">
        <div className="flex justify-end gap-2">
          <button className="btn" onClick={() => setConfirm(false)}>Keep running</button>
          <button className="btn btn-primary" onClick={() => act("stop")} disabled={busy === "stop"}>{busy === "stop" ? <Spinner /> : null} Stop campaign</button>
        </div>
      </Modal>
    </div>
  );
}

export function NewCampaignModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (id: number) => void }) {
  const toast = useToast();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (name.trim().length < 2) return setErr("Give the campaign a name (at least 2 characters).");
    setBusy(true);
    setErr(null);
    try {
      const r = await lg<{ id: number; name: string }>("/email/campaigns", { body: { name: name.trim() } });
      toast.success("Campaign created", `“${r.name}” is a draft. Add leads and emails next.`);
      setName("");
      onCreated(r.id);
    } catch (e2) {
      setErr(e2 instanceof ApiError ? e2.message : "Couldn't create the campaign.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal open={open} onClose={onClose} title="New email campaign" subtitle="Created in Smartlead as a draft. Add leads and write the emails right after.">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Campaign name" error={err} hint="For example: Mansarovar sellers — October">
          <input autoFocus className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} placeholder="Campaign name" />
        </Field>
        <div className="flex justify-end gap-2">
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={busy}>{busy ? <Spinner /> : null} Create campaign</button>
        </div>
      </form>
    </Modal>
  );
}

export function EmailCampaignsClient({ initialStatus, openNew }: { initialStatus: string; openNew: boolean }) {
  const router = useRouter();
  const q = useLg<{ campaigns: EmailCampaign[]; totals: Totals }>("/email/campaigns", 60_000);
  const [filter, setFilter] = useState(initialStatus);
  const [creating, setCreating] = useState(openNew);

  if (q.notConnected) return <ConnectCard icon="MailPlus" title="Connect Smartlead to see your email results" cta="Go to Setup">Campaigns, opens, replies, mailbox health and your email inbox will appear here. It takes one API key and is done once.</ConnectCard>;

  const all = q.data?.campaigns ?? [];
  const norm = (s: string) => (s === "DRAFT" ? "DRAFTED" : s);
  const rows = filter ? all.filter((c) => norm(c.status) === filter) : all;
  const cnt = (s: string) => all.filter((c) => norm(c.status) === s).length;
  const t = q.data?.totals;
  const tiles: Array<[string, number | undefined, string, string]> = [
    ["Leads", t?.leads, "Users", `${t?.campaigns ?? 0} campaigns`],
    ["Emails sent", t?.sent, "Send", `${t?.active ?? 0} active`],
    ["Opened", t?.opened, "MailOpen", `${t?.open_rate ?? 0}% open rate`],
    ["Clicked", t?.clicked, "MousePointerClick", `${t?.click_rate ?? 0}% click rate`],
    ["Replied", t?.replied, "Reply", `${t?.reply_rate ?? 0}% reply rate`],
    ["Positive", t?.positive, "ThumbsUp", "marked interested"],
    ["Bounced", t?.bounced, "Ban", `${t?.bounce_rate ?? 0}% bounce rate`],
  ];

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <Segmented label="Filter by status" value={filter} onChange={setFilter} options={[{ value: "", label: "All", count: all.length }, { value: "ACTIVE", label: "Active", count: cnt("ACTIVE") }, { value: "PAUSED", label: "Paused", count: cnt("PAUSED") }, { value: "DRAFTED", label: "Draft", count: cnt("DRAFTED") }, { value: "STOPPED", label: "Stopped", count: cnt("STOPPED") }]} />
        <div className="ml-auto flex gap-2">
          <button className="btn" onClick={() => lg("/email/campaigns?refresh=1").then(q.refresh).catch(q.refresh)} aria-label="Refresh from Smartlead"><Icon name="RefreshCw" size={15} /></button>
          <button className="btn btn-primary" onClick={() => setCreating(true)}><Icon name="Plus" size={15} /> New campaign</button>
        </div>
      </div>

      <section className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3 mb-5" aria-label="Email totals">
        {tiles.map(([label, value, icon, sub]) => (
          <div key={label} className="card p-4">
            <div className="flex items-center justify-between text-txt-faint"><span className="text-[11px] uppercase tracking-wide font-semibold">{label}</span><Icon name={icon} size={15} /></div>
            {q.loading ? <Skeleton className="h-7 w-14 mt-2" /> : <div className="font-display text-2xl font-bold mt-1.5">{num(value)}</div>}
            <div className="text-[11px] text-txt-dim mt-1 truncate">{sub}</div>
          </div>
        ))}
      </section>

      {q.error && !q.data ? <p className="text-sm text-red">{q.error.message}</p> : (
        <div className="card overflow-hidden">
          {q.loading ? <div className="p-5 space-y-3"><Skeleton className="h-10" /><Skeleton className="h-10" /></div> : rows.length === 0 ? (
            <EmptyState icon="MailPlus" title={all.length ? "No campaigns in this view" : "No email campaigns yet"} hint={all.length ? "Try a different filter." : "Create your first campaign — you can add leads and write the emails right here."} action={!all.length ? <button className="btn btn-primary" onClick={() => setCreating(true)}><Icon name="Plus" size={15} /> New campaign</button> : undefined} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs text-txt-faint font-semibold uppercase tracking-wide">
                    <th className="py-3 pl-5 pr-4">Campaign</th><th className="py-3 pr-4">Status</th><th className="py-3 pr-4 text-right">Leads</th><th className="py-3 pr-4 text-right">Sent</th><th className="py-3 pr-4 text-right">Opened</th><th className="py-3 pr-4 text-right">Replied</th><th className="py-3 pr-4 text-right">Bounced</th><th className="py-3 pr-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((c) => (
                    <tr key={c.id} onClick={() => router.push(`/leadgen/email/${c.id}`)} className="border-b border-line/40 hover:bg-panel-2/60 cursor-pointer transition-colors">
                      <td className="py-3 pl-5 pr-4"><div className="font-semibold">{c.name}</div><div className="text-xs text-txt-dim">{c.created_at ? `Created ${timeAgoIso(c.created_at)}` : `#${c.id}`}</div></td>
                      <td className="py-3 pr-4"><StatusPill status={c.status} /></td>
                      <td className="py-3 pr-4 text-right tabular-nums">{num(c.leads)}</td>
                      <td className="py-3 pr-4 text-right tabular-nums">{num(c.sent)}</td>
                      <td className="py-3 pr-4 text-right tabular-nums">{num(c.opened)} <span className="text-xs text-txt-faint">{c.open_rate}%</span></td>
                      <td className="py-3 pr-4 text-right tabular-nums">{num(c.replied)} <span className="text-xs text-txt-faint">{c.positive ? `· ${c.positive}👍` : ""}</span></td>
                      <td className="py-3 pr-4 text-right tabular-nums">{num(c.bounced)}</td>
                      <td className="py-3 pr-5"><div className="flex justify-end"><StatusActions id={c.id} status={c.status} onDone={q.refresh} /></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
      <NewCampaignModal open={creating} onClose={() => setCreating(false)} onCreated={(id) => (setCreating(false), q.refresh(), id && router.push(`/leadgen/email/${id}`))} />
    </>
  );
}
