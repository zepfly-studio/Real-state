"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";
import { EmptyState } from "@/components/ui";
import type { ThreadRow } from "@/lib/leadgen/queries";
import { ApiError, Avatar, lg, Segmented, Skeleton, Spinner, StageBadge, Ago, timeAgoIso, useLg, useToast } from "./kit";

type Channel = "" | "email" | "whatsapp";

interface MailItem {
  id: string;
  lead: { email: string; name: string };
  campaign: { id: number; name: string };
  subject: string;
  preview: string;
  received_at: string | null;
  category: string;
  is_read: boolean;
}
interface Item {
  key: string;
  channel: "email" | "whatsapp";
  name: string;
  preview: string;
  at: number;
  iso: string;
  awaiting: boolean;
  thread?: ThreadRow;
  mail?: MailItem;
}

const toDate = (x?: string | null) => (!x ? new Date(0) : /[zZ]$|[+-]\d\d:?\d\d$/.test(x) ? new Date(x) : new Date(`${x}Z`));
const phoneKey = (p: string) => p.replace(/\D/g, "").slice(-10);

export function InboxClient({ threads, initialChannel, initialAwaiting }: { threads: ThreadRow[]; initialChannel: Channel; initialAwaiting: boolean }) {
  const mail = useLg<{ items: MailItem[] }>("/email/inbox", 60_000);
  const [channel, setChannel] = useState<Channel>(initialChannel);
  const [awaiting, setAwaiting] = useState(initialAwaiting);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<string | null>(null);

  const items = useMemo<Item[]>(() => {
    const wa: Item[] = threads.map((t) => {
      const last = t.messages[t.messages.length - 1];
      const d = toDate(last?.at);
      return { key: `wa:${phoneKey(t.phone)}`, channel: "whatsapp", name: t.leadName || t.phone, preview: `${last?.direction === "OUTBOUND" ? "You: " : ""}${last?.text ?? ""}`, at: d.getTime(), iso: d.toISOString(), awaiting: last?.direction === "INBOUND", thread: t };
    });
    const em: Item[] = (mail.data?.items ?? []).map((m) => {
      const d = toDate(m.received_at);
      return { key: `em:${m.campaign.id}:${m.lead.email.toLowerCase()}`, channel: "email", name: m.lead.name, preview: m.subject ? `${m.subject} — ${m.preview}` : m.preview, at: d.getTime(), iso: d.toISOString(), awaiting: !m.is_read, mail: m };
    });
    return [...wa, ...em].sort((a, b) => b.at - a.at);
  }, [threads, mail.data]);

  const searched = items.filter((i) => !q.trim() || [i.name, i.preview, i.mail?.lead.email, i.thread?.phone].some((x) => String(x ?? "").toLowerCase().includes(q.trim().toLowerCase())));
  const byChannel = channel ? searched.filter((i) => i.channel === channel) : searched;
  const list = awaiting ? byChannel.filter((i) => i.awaiting) : byChannel;
  const active = list.find((i) => i.key === (sel ?? list[0]?.key)) ?? null;
  const count = (c: "email" | "whatsapp") => searched.filter((i) => i.channel === c).length;

  return (
    <div className="card overflow-hidden">
      <div className="grid h-[calc(100dvh-17rem)] min-h-[520px] lg:grid-cols-[360px_1fr]">
        <section aria-label="Conversations" className={`min-h-0 flex-col border-line lg:flex lg:border-r ${sel ? "hidden" : "flex"}`}>
          <div className="border-b border-line p-3 space-y-2">
            <Segmented label="Filter by channel" value={channel} onChange={setChannel} options={[{ value: "", label: "All", count: searched.length }, { value: "email", label: "Email", count: count("email") }, { value: "whatsapp", label: "WhatsApp", count: count("whatsapp") }]} />
            <div className="flex items-center gap-2">
              <input className="input !py-2" placeholder="Search conversations…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search conversations" />
              <button type="button" aria-pressed={awaiting} onClick={() => setAwaiting(!awaiting)} className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold ${awaiting ? "border-gold bg-gold-soft text-gold-bright" : "border-line text-txt-dim hover:text-txt"}`}>
                Needs a reply · {byChannel.filter((i) => i.awaiting).length}
              </button>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {mail.loading && channel !== "whatsapp" && <div className="p-3 space-y-2"><Skeleton className="h-14" /></div>}
            {list.length === 0 && !mail.loading ? (
              <EmptyState icon="Inbox" title="No conversations" hint={items.length ? "Nothing matches these filters." : "Replies from WhatsApp and email will appear here."} />
            ) : (
              <ul>
                {list.map((i) => (
                  <li key={i.key}>
                    <button onClick={() => setSel(i.key)} className={`flex w-full items-start gap-3 border-b border-line-soft px-4 py-3 text-left transition-colors ${active?.key === i.key ? "bg-gold-soft" : "hover:bg-panel-2/60"}`}>
                      <Avatar name={i.name} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`truncate text-sm ${i.awaiting ? "font-bold" : "font-semibold"}`}>{i.name}</span>
                          <span className="ml-auto shrink-0 text-[11px] text-txt-faint"><Ago iso={i.iso} /></span>
                        </div>
                        <div className="mt-0.5 flex items-center gap-1.5">
                          <span className="text-txt-faint"><Icon name={i.channel === "email" ? "Mail" : "MessageCircle"} size={12} /></span>
                          <span className="truncate text-xs text-txt-dim">{i.preview}</span>
                        </div>
                      </div>
                      {i.awaiting && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-gold" aria-label="Needs a reply" />}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section aria-label="Conversation" className={`min-h-0 flex-col lg:flex ${sel ? "flex" : "hidden"}`}>
          {active ? (
            <>
              <button className="lg:hidden flex items-center gap-1 px-4 py-2 text-sm text-gold-bright border-b border-line" onClick={() => setSel(null)}><Icon name="ArrowLeft" size={15} /> Back</button>
              {active.channel === "whatsapp" && active.thread ? <WhatsAppThread key={active.key} thread={active.thread} /> : active.mail ? <EmailThread key={active.key} item={active.mail} /> : null}
            </>
          ) : (
            <div className="grid flex-1 place-items-center"><EmptyState icon="MessagesSquare" title="Pick a conversation" hint="Choose one on the left to read and reply." /></div>
          )}
        </section>
      </div>
    </div>
  );
}

function Header({ name, sub, right }: { name: string; sub: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 border-b border-line px-5 py-3">
      <Avatar name={name} size={40} />
      <div className="min-w-0 flex-1"><div className="truncate font-semibold">{name}</div><div className="truncate text-xs text-txt-dim">{sub}</div></div>
      {right}
    </div>
  );
}

function Composer({ placeholder, onSend, disabled, hint }: { placeholder: string; onSend: (t: string) => Promise<void>; disabled?: boolean; hint?: string }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  async function go() {
    if (!text.trim() || busy) return;
    setBusy(true);
    try {
      await onSend(text.trim());
      setText("");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="border-t border-line p-3">
      <div className="flex items-end gap-2">
        <textarea
          rows={2}
          className="input resize-none"
          placeholder={placeholder}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => (e.key === "Enter" && (e.ctrlKey || e.metaKey) ? go() : undefined)}
          disabled={disabled}
          aria-label="Reply"
        />
        <button className="btn btn-primary" onClick={go} disabled={disabled || busy || !text.trim()}>{busy ? <Spinner /> : <Icon name="Send" size={15} />} Send</button>
      </div>
      {hint && <p className="mt-1.5 text-[11px] text-txt-faint">{hint}</p>}
    </div>
  );
}

function WhatsAppThread({ thread }: { thread: ThreadRow }) {
  const router = useRouter();
  const toast = useToast();
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [thread.messages.length]);
  return (
    <>
      <Header name={thread.leadName || thread.phone} sub={thread.phone} right={thread.leadStatus ? <StageBadge value={thread.leadStatus} /> : undefined} />
      <div className="min-h-0 flex-1 overflow-y-auto bg-bg-2/60 px-5 py-4 space-y-2">
        {thread.messages.map((m) => (
          <div key={m.id} className={`flex ${m.direction === "OUTBOUND" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm ${m.direction === "OUTBOUND" ? "bg-gold text-[var(--on-gold)] rounded-br-md" : "bg-panel border border-line rounded-bl-md"}`}>
              <p className="whitespace-pre-wrap break-words">{m.text}</p>
              <p className={`mt-1 text-[10px] ${m.direction === "OUTBOUND" ? "opacity-70" : "text-txt-faint"}`}>{m.direction === "OUTBOUND" ? "Sent" : "Received"} · <Ago iso={m.at} /></p>
            </div>
          </div>
        ))}
        <div ref={end} />
      </div>
      <Composer
        placeholder="Reply on WhatsApp…"
        hint="Ctrl + Enter to send. Messages appear here only after WhatsApp confirms delivery."
        onSend={async (text) => {
          try {
            await lg("/messages/send", { body: { phone: thread.phone, text } });
            toast.success("Message sent");
            router.refresh();
          } catch (e) {
            toast.error("Message not sent", e instanceof ApiError ? e.message : undefined);
            throw e;
          }
        }}
      />
    </>
  );
}

function EmailThread({ item }: { item: MailItem }) {
  const toast = useToast();
  const q = useLg<{ messages: Array<{ id: string; direction: "INBOUND" | "OUTBOUND"; subject: string; body: string; at: string | null }> }>(
    `/email/inbox/thread?campaign_id=${item.campaign.id}&email=${encodeURIComponent(item.lead.email)}`
  );
  return (
    <>
      <Header name={item.lead.name} sub={`${item.lead.email} · ${item.campaign.name}`} right={item.category ? <span className={`tag ${item.category === "Interested" ? "bg-[rgba(62,199,141,.14)] text-green" : "bg-panel-2 text-txt-dim"}`}>{item.category}</span> : undefined} />
      <div className="min-h-0 flex-1 overflow-y-auto bg-bg-2/60 px-5 py-4 space-y-3">
        {q.loading ? <Skeleton className="h-24" /> : q.error ? <p className="text-sm text-red">{q.error.message}</p> : (q.data?.messages ?? []).map((m) => (
          <div key={m.id} className={`flex ${m.direction === "OUTBOUND" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${m.direction === "OUTBOUND" ? "bg-gold text-[var(--on-gold)] rounded-br-md" : "bg-panel border border-line rounded-bl-md"}`}>
              {m.subject && <p className="mb-1 text-xs font-bold opacity-80">{m.subject}</p>}
              <p className="whitespace-pre-wrap break-words">{m.body}</p>
              <p className={`mt-1 text-[10px] ${m.direction === "OUTBOUND" ? "opacity-70" : "text-txt-faint"}`}>{m.direction === "OUTBOUND" ? "Sent" : "Received"} · <Ago iso={m.at} /></p>
            </div>
          </div>
        ))}
      </div>
      <Composer
        placeholder="Reply by email…"
        hint="Sent from the same mailbox the campaign used, with its signature."
        onSend={async (text) => {
          try {
            await lg("/email/inbox/reply", { body: { campaign_id: item.campaign.id, to_email: item.lead.email, body: text } });
            toast.success("Reply sent");
            q.refresh();
          } catch (e) {
            toast.error("Reply not sent", e instanceof ApiError ? e.message : undefined);
            throw e;
          }
        }}
      />
    </>
  );
}
