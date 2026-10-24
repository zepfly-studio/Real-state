"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";
import { EmptyState } from "@/components/ui";
import { ApiError, Avatar, lg, Spinner, useToast } from "./kit";

export interface ReadyLead {
  id: string;
  name: string | null;
  phone: string | null;
  address: string | null;
  askingPrice: number | null;
  timeline: string | null;
  crmLeadId: string | null;
}

/** Interested sellers, with a one-tap "Add to CRM". */
export function ReadyList({ leads }: { leads: ReadyLead[] }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);

  async function add(l: ReadyLead) {
    setBusy(l.id);
    try {
      const r = await lg<{ created: boolean }>(`/leads/${l.id}/crm`, { method: "POST", body: {} });
      toast.success(r.created ? "Added to the CRM" : "Linked to the existing CRM lead", l.name || l.phone || "");
      router.refresh();
    } catch (e) {
      toast.error("Couldn't add to the CRM", e instanceof ApiError ? e.message : undefined);
    } finally {
      setBusy(null);
    }
  }

  if (!leads.length) return <EmptyState icon="Star" title="No interested prospects yet" hint="Mark a prospect Interested after they reply, and they appear here." />;
  return (
    <ul className="divide-y divide-line-soft">
      {leads.map((l) => (
        <li key={l.id} className="flex items-center gap-3 py-3">
          <Avatar name={l.name} />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold truncate">{l.name || l.phone || "Unknown"}</div>
            <div className="text-xs text-txt-dim truncate">{l.address || l.phone || ""}{l.timeline ? ` · ${l.timeline}` : ""}</div>
          </div>
          {l.crmLeadId ? (
            <a href="/crm" className="tag bg-[rgba(62,199,141,.14)] text-green inline-flex items-center gap-1"><Icon name="Check" size={12} /> In CRM</a>
          ) : (
            <button className="btn !py-1.5 !px-3 text-[13px]" onClick={() => add(l)} disabled={busy === l.id}>
              {busy === l.id ? <Spinner /> : <Icon name="UserPlus" size={14} />} Add to CRM
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
