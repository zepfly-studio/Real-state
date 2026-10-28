"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";
import { EmptyState } from "@/components/ui";
import type { LgLeadRow, ThreadRow } from "@/lib/leadgen/queries";
import { LG_STAGES, STAGE_META } from "@/lib/leadgen/stages";
import { ApiError, Avatar, lg, Modal, Segmented, Spinner, StageBadge, Ago, timeAgoIso, useToast } from "./kit";

const PAGE = 15;

/** Seniority/fit score from the search plan → a plain label. */
function Priority({ score }: { score: number }) {
  if (score >= 70) return <span className="tag bg-[rgba(62,199,141,.14)] text-green">Decision maker</span>;
  if (score >= 40) return <span className="tag bg-gold-soft text-gold-bright">Good fit</span>;
  return <span className="text-xs text-txt-faint">—</span>;
}
const phoneKey = (p?: string | null) => String(p ?? "").replace(/\D/g, "").slice(-10);
const inr = (n: number | null) => (n == null ? "—" : "₹" + Math.round(n).toLocaleString("en-IN"));

function csvCell(v: unknown) {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function LeadsClient({ leads, threads, initialStage }: { leads: LgLeadRow[]; threads: ThreadRow[]; initialStage: string }) {
  const router = useRouter();
  const [stage, setStage] = useState(initialStage);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const [openId, setOpenId] = useState<string | null>(null);

  const searched = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? leads.filter((l) => [l.name, l.phone, l.email, l.address, l.campaignName, l.title, l.company, l.city].some((x) => String(x ?? "").toLowerCase().includes(s))) : leads;
  }, [leads, q]);
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const l of searched) c[l.status] = (c[l.status] ?? 0) + 1;
    return c;
  }, [searched]);
  const [byPriority, setByPriority] = useState(true);
  const filteredRows = stage ? searched.filter((l) => l.status === stage) : searched;
  const rows = byPriority ? [...filteredRows].sort((a, b) => b.score - a.score) : filteredRows;
  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const safe = Math.min(page, pages - 1);
  const slice = rows.slice(safe * PAGE, safe * PAGE + PAGE);
  const open = leads.find((l) => l.id === openId) ?? null;

  function pickStage(v: string) {
    setStage(v);
    setPage(0);
    router.replace(v ? `/leadgen/leads?stage=${v}` : "/leadgen/leads", { scroll: false });
  }

  function exportCsv() {
    const head = ["Name", "Title", "Company", "Phone", "Email", "LinkedIn", "Website", "City", "Address", "Priority", "Stage", "Asking price", "Timeline", "Campaign", "Messages", "In CRM", "Found", "Last update"];
    const body = rows.map((l) => [l.name, l.title, l.company, l.phone, l.email, l.linkedin, l.website, l.city, l.address, l.score, STAGE_META[l.status as keyof typeof STAGE_META]?.label ?? l.status, l.askingPrice, l.timeline, l.campaignName, l.messageCount, l.crmLeadId ? "Yes" : "No", l.createdAt, l.updatedAt]);
    const csv = "﻿" + [head, ...body].map((r) => r.map(csvCell).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `prospects-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <Segmented
          label="Filter by stage"
          value={stage}
          onChange={pickStage}
          options={[{ value: "", label: "All", count: searched.length }, ...LG_STAGES.filter((s) => counts[s]).map((s) => ({ value: s as string, label: STAGE_META[s].label, count: counts[s] }))]}
        />
        <div className="relative ml-auto w-full sm:w-72">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-txt-faint"><Icon name="Search" size={15} /></span>
          <input className="input !pl-9" placeholder="Search name, phone, property…" value={q} onChange={(e) => (setQ(e.target.value), setPage(0))} aria-label="Search prospects" />
        </div>
        <button className={`btn ${byPriority ? "!border-gold !text-gold-bright" : ""}`} aria-pressed={byPriority} onClick={() => setByPriority(!byPriority)}><Icon name="ArrowDownWideNarrow" size={15} /> Decision makers first</button>
        <button className="btn" onClick={exportCsv} disabled={!rows.length}><Icon name="Download" size={15} /> Export CSV</button>
      </div>

      <div className="card overflow-hidden">
        {rows.length === 0 ? (
          <EmptyState icon="UserSearch" title={leads.length ? "No prospects match" : "No prospects yet"} hint={leads.length ? "Try a different stage or search." : "Launch a campaign from the Overview and prospects will appear here."} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs text-txt-faint font-semibold uppercase tracking-wide">
                  <th className="py-3 pl-5 pr-4">Prospect</th><th className="py-3 pr-4">Role &amp; company</th><th className="py-3 pr-4">Contact</th><th className="py-3 pr-4">Stage</th><th className="py-3 pr-4">Priority</th><th className="py-3 pr-4">Chat</th><th className="py-3 pr-5 text-right">Updated</th>
                </tr>
              </thead>
              <tbody>
                {slice.map((l) => (
                  <tr key={l.id} onClick={() => setOpenId(l.id)} className="border-b border-line/40 hover:bg-panel-2/60 cursor-pointer transition-colors">
                    <td className="py-3 pl-5 pr-4">
                      <div className="flex items-center gap-3">
                        <Avatar name={l.name} />
                        <div className="min-w-0">
                          <div className="font-semibold truncate">{l.name || "Unknown"}</div>
                          <div className="text-xs text-txt-dim truncate">{l.city || l.campaignName || "—"}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 pr-4 max-w-[240px]"><div className="truncate">{l.title || "—"}</div><div className="text-xs text-txt-dim truncate">{l.company || l.address || ""}</div></td>
                    <td className="py-3 pr-4 max-w-[220px]"><div className="tabular-nums whitespace-nowrap">{l.phone || "—"}</div><div className="text-xs text-txt-dim truncate">{l.email || ""}</div></td>
                    <td className="py-3 pr-4"><div className="flex items-center gap-1.5"><StageBadge value={l.status} />{l.crmLeadId && <span title="In the CRM" className="text-green"><Icon name="BadgeCheck" size={15} /></span>}</div></td>
                    <td className="py-3 pr-4"><Priority score={l.score} /></td>
                    <td className="py-3 pr-4 tabular-nums text-txt-dim">{l.messageCount || "—"}</td>
                    <td className="py-3 pr-5 text-right text-txt-dim whitespace-nowrap"><Ago iso={l.updatedAt} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {rows.length > PAGE && (
          <div className="flex items-center justify-between border-t border-line px-5 py-3 text-sm text-txt-dim">
            <span>Showing {safe * PAGE + 1}–{Math.min((safe + 1) * PAGE, rows.length)} of {rows.length}</span>
            <div className="flex gap-2">
              <button className="btn !py-1.5" disabled={safe === 0} onClick={() => setPage(safe - 1)}><Icon name="ChevronLeft" size={15} /> Prev</button>
              <button className="btn !py-1.5" disabled={safe >= pages - 1} onClick={() => setPage(safe + 1)}>Next <Icon name="ChevronRight" size={15} /></button>
            </div>
          </div>
        )}
      </div>

      <LeadDrawer lead={open} thread={open ? threads.find((t) => phoneKey(t.phone) === phoneKey(open.phone)) ?? null : null} onClose={() => setOpenId(null)} />
    </>
  );
}

function LeadDrawer({ lead, thread, onClose }: { lead: LgLeadRow | null; thread: ThreadRow | null; onClose: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);

  async function run(kind: "HOT_LEAD" | "UNQUALIFIED" | "crm") {
    if (!lead) return;
    setBusy(kind);
    try {
      if (kind === "crm") {
        const r = await lg<{ created: boolean }>(`/leads/${lead.id}/crm`, { method: "POST", body: {} });
        toast.success(r.created ? "Added to the CRM" : "Linked to the existing CRM lead", lead.name || lead.phone || lead.email || "");
      } else {
        await lg(`/leads/${lead.id}/status`, { method: "PATCH", body: { status: kind } });
        toast.success(kind === "HOT_LEAD" ? "Marked as interested" : "Marked as not interested", lead.name || lead.phone || lead.email || "");
      }
      router.refresh();
    } catch (e) {
      toast.error("Couldn't update the prospect", e instanceof ApiError ? e.message : undefined);
    } finally {
      setBusy(null);
    }
  }

  if (!lead) return null;
  const steps = ["SCRAPED", "EMAIL_SENT", "WHATSAPP_SENT"] as const;
  const cur = STAGE_META[lead.status as keyof typeof STAGE_META]?.rank ?? 0;
  const outcome = lead.status === "HOT_LEAD" || lead.status === "UNQUALIFIED";
  const notes: Record<string, string> = { SCRAPED: "Found and saved", EMAIL_SENT: "Cold email queued in Smartlead", WHATSAPP_SENT: "WhatsApp intro sent" };

  return (
    <Modal open onClose={onClose} title={lead.name || "Unknown prospect"} subtitle={lead.campaignName ?? undefined} wide>
      <div className="flex items-center gap-2 mb-5"><StageBadge value={lead.status} />{lead.crmLeadId && <span className="tag bg-[rgba(62,199,141,.14)] text-green">In CRM</span>}</div>

      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="card p-3"><div className="text-[11px] uppercase tracking-wide text-txt-faint font-semibold">Asking price</div><div className="font-display text-lg font-bold">{inr(lead.askingPrice)}</div></div>
        <div className="card p-3"><div className="text-[11px] uppercase tracking-wide text-txt-faint font-semibold">Timeline to sell</div><div className="font-display text-lg font-bold">{lead.timeline || "—"}</div></div>
      </div>

      <h4 className="section-label mb-2">Contact</h4>
      <ul className="card divide-y divide-line-soft mb-5 text-sm">
        {[["Title", [lead.title, lead.company].filter(Boolean).join(" · "), "BriefcaseBusiness"], ["Phone", lead.phone, "Phone"], ["Email", lead.email, "Mail"], ["LinkedIn", lead.linkedin, "Linkedin"], ["Website", lead.website, "Globe"], ["Address", lead.address || lead.city, "MapPin"]].filter(([, v], i) => i < 3 || v).map(([k, v, ic]) => (
          <li key={k as string} className="flex items-center gap-3 px-4 py-2.5"><span className="text-txt-faint"><Icon name={ic as string} size={15} /></span><span className="w-16 text-xs text-txt-faint">{k}</span><span className="font-medium truncate">{(v as string) || "—"}</span></li>
        ))}
      </ul>

      <h4 className="section-label mb-2">Journey</h4>
      <ol className="mb-5 space-y-2.5">
        {steps.map((s, i) => {
          const done = outcome || i < cur;
          const now = !outcome && i === cur;
          return (
            <li key={s} className="flex items-start gap-3">
              <span className={`mt-0.5 grid h-5 w-5 place-items-center rounded-full text-[10px] ${done ? "bg-gold text-[var(--on-gold)]" : now ? "border-2 border-gold" : "border border-line"}`}>{done ? <Icon name="Check" size={11} /> : ""}</span>
              <div><div className={`text-sm font-semibold ${!done && !now ? "text-txt-faint" : ""}`}>{STAGE_META[s].label}{now && <span className="ml-2 tag bg-gold-soft text-gold-bright">Now</span>}</div><div className="text-xs text-txt-dim">{notes[s]}</div></div>
            </li>
          );
        })}
        {outcome && (
          <li className="flex items-start gap-3">
            <span className={`mt-0.5 grid h-5 w-5 place-items-center rounded-full text-white ${lead.status === "HOT_LEAD" ? "bg-green" : "bg-red"}`}><Icon name={lead.status === "HOT_LEAD" ? "Star" : "X"} size={11} /></span>
            <div><div className="text-sm font-semibold">{STAGE_META[lead.status as keyof typeof STAGE_META].label}</div><div className="text-xs text-txt-dim">{lead.status === "HOT_LEAD" ? "Open to an offer — worth a personal follow-up" : "Not interested in selling right now"}</div></div>
          </li>
        )}
      </ol>

      <h4 className="section-label mb-2">Outcome</h4>
      <div className="flex flex-wrap gap-2 mb-1">
        <button className={`btn ${lead.status === "HOT_LEAD" ? "" : "btn-primary"}`} disabled={busy !== null || lead.status === "HOT_LEAD"} onClick={() => run("HOT_LEAD")}>{busy === "HOT_LEAD" ? <Spinner /> : <Icon name="Star" size={15} />} Interested</button>
        <button className="btn" disabled={busy !== null || lead.status === "UNQUALIFIED"} onClick={() => run("UNQUALIFIED")}>{busy === "UNQUALIFIED" ? <Spinner /> : <Icon name="CircleX" size={15} />} Not interested</button>
        {!lead.crmLeadId && <button className="btn" disabled={busy !== null} onClick={() => run("crm")}>{busy === "crm" ? <Spinner /> : <Icon name="UserPlus" size={15} />} Add to CRM</button>}
      </div>
      <p className="text-xs text-txt-faint mb-5">After reading their reply, mark where they stand. Adding to the CRM creates a lead in Sales &amp; Support CRM (or links the one that already has this phone number).</p>

      <h4 className="section-label mb-2">WhatsApp</h4>
      {thread && thread.messages.length ? (
        <div className="rounded-xl bg-bg-2 border border-line p-3 space-y-2 max-h-64 overflow-y-auto">
          {thread.messages.slice(-12).map((m) => (
            <div key={m.id} className={`flex ${m.direction === "OUTBOUND" ? "justify-end" : "justify-start"}`}>
              <p className={`max-w-[85%] rounded-2xl px-3 py-1.5 text-[13px] ${m.direction === "OUTBOUND" ? "bg-gold text-[var(--on-gold)] rounded-br-md" : "bg-panel border border-line rounded-bl-md"}`}>{m.text}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-txt-dim">No WhatsApp messages with this prospect yet.</p>
      )}
      <div className="mt-4 text-right"><Link href="/leadgen/inbox" className="text-sm font-semibold text-gold-bright">Open the inbox →</Link></div>
    </Modal>
  );
}
