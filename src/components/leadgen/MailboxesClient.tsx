"use client";
import { Icon } from "@/components/Icon";
import { EmptyState } from "@/components/ui";
import { Avatar, ConnectCard, Skeleton, useLg, num } from "./kit";

interface Account {
  id: number;
  name: string;
  email: string;
  type: string;
  daily_limit: number;
  sent_today: number;
  smtp_ok: boolean | null;
  imap_ok: boolean | null;
  smtp_error: string | null;
  imap_error: string | null;
  warmup_status: string;
  warmup_reputation: number | null;
  campaign_count: number;
}
interface Data { accounts: Account[]; totals: { accounts: number; healthy: number; warming: number; daily_capacity: number; sent_today: number } }

const Dot = ({ ok, label }: { ok: boolean | null; label: string }) => (
  <span className={`inline-flex items-center gap-1 ${ok === false ? "text-red" : ok ? "text-green" : "text-txt-faint"}`}><Icon name={ok === false ? "X" : "Check"} size={13} /> {label}</span>
);

export function MailboxesClient() {
  const q = useLg<Data>("/email/accounts", 60_000);
  if (q.notConnected) return <ConnectCard icon="Inbox" title="Connect Smartlead to see your mailboxes" cta="Go to Setup">Sending accounts, warm-up health and daily capacity appear here once Smartlead is connected.</ConnectCard>;
  if (q.error && !q.data) return <p className="text-sm text-red">{q.error.message}</p>;
  const t = q.data?.totals;
  const tiles: Array<[string, string, string, string]> = [
    ["Mailboxes", num(t?.accounts), "Inbox", "connected to Smartlead"],
    ["Healthy", num(t?.healthy), "HeartPulse", `${(t?.accounts ?? 0) - (t?.healthy ?? 0)} need attention`],
    ["Warming up", num(t?.warming), "Flame", "building reputation"],
    ["Daily capacity", num(t?.daily_capacity), "Gauge", "emails per day"],
    ["Sent today", num(t?.sent_today), "Send", t?.daily_capacity ? `${Math.round(((t.sent_today ?? 0) * 100) / t.daily_capacity)}% of capacity` : ""],
  ];
  return (
    <>
      <section className="grid grid-cols-2 xl:grid-cols-5 gap-3 mb-5">
        {tiles.map(([label, value, icon, sub]) => (
          <div key={label} className="card p-4">
            <div className="flex items-center justify-between text-txt-faint"><span className="text-[11px] uppercase tracking-wide font-semibold">{label}</span><Icon name={icon} size={15} /></div>
            {q.loading ? <Skeleton className="h-7 w-14 mt-2" /> : <div className="font-display text-2xl font-bold mt-1.5">{value}</div>}
            <div className="text-[11px] text-txt-dim mt-1 truncate">{sub}</div>
          </div>
        ))}
      </section>
      <div className="card overflow-hidden">
        {q.loading ? <div className="p-5"><Skeleton className="h-24" /></div> : !q.data?.accounts.length ? (
          <EmptyState icon="Inbox" title="No mailboxes yet" hint="Add a sending mailbox in Smartlead (Settings → Email Accounts) and it shows up here." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead><tr className="border-b border-line text-left text-xs text-txt-faint font-semibold uppercase tracking-wide"><th className="py-3 pl-5 pr-4">Mailbox</th><th className="py-3 pr-4">Warm-up</th><th className="py-3 pr-4">Reputation</th><th className="py-3 pr-4">Sent today</th><th className="py-3 pr-4">Connection</th><th className="py-3 pr-5 text-right">Campaigns</th></tr></thead>
              <tbody>
                {q.data.accounts.map((a) => {
                  const rep = a.warmup_reputation;
                  return (
                    <tr key={a.id} className="border-b border-line/40">
                      <td className="py-3 pl-5 pr-4"><div className="flex items-center gap-3"><Avatar name={a.name || a.email} /><div className="min-w-0"><div className="font-semibold truncate">{a.name || a.email}</div><div className="text-xs text-txt-dim truncate">{a.email} · {a.type}</div></div></div></td>
                      <td className="py-3 pr-4"><span className={`tag ${a.warmup_status === "ACTIVE" ? "bg-[rgba(62,199,141,.14)] text-green" : "bg-panel-2 text-txt-dim"}`}>{a.warmup_status === "ACTIVE" ? "Warming" : "Off"}</span></td>
                      <td className="py-3 pr-4">{rep == null ? "—" : <div className="flex items-center gap-2"><div className="h-1.5 w-20 rounded-full bg-panel-2 overflow-hidden"><div className="h-full rounded-full" style={{ width: `${Math.min(rep, 100)}%`, background: rep >= 80 ? "var(--green)" : rep >= 50 ? "var(--gold)" : "var(--red)" }} /></div><span className="tabular-nums">{rep}%</span></div>}</td>
                      <td className="py-3 pr-4 tabular-nums">{a.sent_today} <span className="text-txt-faint">/ {a.daily_limit}</span></td>
                      <td className="py-3 pr-4 text-xs"><div className="flex flex-col gap-0.5"><Dot ok={a.smtp_ok} label="Sending" /><Dot ok={a.imap_ok} label="Receiving" /></div>{(a.smtp_error || a.imap_error) && <div className="text-[11px] text-red mt-0.5">Authentication failed</div>}</td>
                      <td className="py-3 pr-5 text-right tabular-nums">{a.campaign_count}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
