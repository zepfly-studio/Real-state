"use client";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { Skeleton, useLg, num } from "./kit";

interface Totals { sent: number; opened: number; replied: number; positive: number; active: number; open_rate: number }

/** Email channel card for the Overview: Smartlead totals, or a connect prompt. */
export function EmailSummaryCard() {
  const q = useLg<{ totals: Totals }>("/email/summary", 60_000);
  const t = q.data?.totals;
  return (
    <div className={`card p-5 ${q.notConnected ? "border-dashed" : ""}`}>
      <div className="flex items-center gap-2.5 mb-4">
        <span className="grid place-items-center w-8 h-8 rounded-lg bg-gold-soft text-gold-bright"><Icon name="Mail" size={16} /></span>
        <h3 className="font-display font-bold">Email</h3>
        <span className="ml-auto text-xs text-txt-faint">Smartlead</span>
      </div>
      {q.notConnected ? (
        <>
          <p className="text-sm text-txt-dim">Connect Smartlead to see sends, opens and replies here.</p>
          <Link href="/leadgen/setup" className="text-sm font-semibold text-gold-bright mt-4 inline-flex items-center gap-1">Connect Smartlead <Icon name="ArrowRight" size={14} /></Link>
        </>
      ) : q.error && !q.data ? (
        <p className="text-sm text-red">{q.error.message}</p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3">
            {[
              ["Sent", q.loading ? null : num(t?.sent), `${t?.active ?? 0} active`],
              ["Opened", q.loading ? null : `${t?.open_rate ?? 0}%`, ""],
              ["Replied", q.loading ? null : num(t?.replied), t?.positive ? `${t.positive} positive` : ""],
            ].map(([label, value, sub]) => (
              <div key={label as string} className="min-w-0">
                <div className="text-[11px] uppercase tracking-wide text-txt-faint font-semibold">{label}</div>
                {value === null ? <Skeleton className="h-8 w-16 mt-1" /> : <div className="font-display text-2xl font-bold mt-1">{value}</div>}
                {sub && <div className="text-xs text-txt-dim mt-0.5 truncate">{sub}</div>}
              </div>
            ))}
          </div>
          <Link href="/leadgen/email" className="text-sm font-semibold text-gold-bright mt-4 inline-flex items-center gap-1">Open email campaigns <Icon name="ArrowRight" size={14} /></Link>
        </>
      )}
    </div>
  );
}
