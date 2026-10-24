"use client";
import { KeyboardEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";
import { ApiError, lg, Spinner, useToast } from "./kit";

interface Plan {
  target: string;
  keywords: string[];
  include_titles: string[];
  exclude_titles: string[];
  seniority: string[];
  location: string;
  lead_count: number;
  notes: string;
}

/** Editable list of chips: × removes, typing + Enter adds. */
function Chips({ label, tone, items, onChange, placeholder }: { label: string; tone: "gold" | "green" | "red"; items: string[]; onChange: (v: string[]) => void; placeholder: string }) {
  const [draft, setDraft] = useState("");
  const cls = tone === "green" ? "bg-[rgba(62,199,141,.14)] text-green" : tone === "red" ? "bg-[rgba(240,85,106,.14)] text-red" : "bg-gold-soft text-gold-bright";
  const add = () => {
    const v = draft.trim().toLowerCase();
    if (v && !items.includes(v)) onChange([...items, v]);
    setDraft("");
  };
  return (
    <div>
      <span className="field-label">{label}</span>
      <div className="flex flex-wrap gap-1.5 rounded-[10px] border border-line bg-bg-2 p-2">
        {items.map((x) => (
          <span key={x} className={`tag ${cls} inline-flex items-center gap-1`}>
            {x}
            <button type="button" aria-label={`Remove ${x}`} onClick={() => onChange(items.filter((y) => y !== x))} className="opacity-70 hover:opacity-100">
              <Icon name="X" size={11} />
            </button>
          </span>
        ))}
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => (e.key === "Enter" || e.key === ",") && (e.preventDefault(), add())}
          onBlur={add}
          placeholder={placeholder}
          aria-label={`Add to ${label}`}
          className="min-w-[120px] flex-1 bg-transparent px-1 text-[13px] outline-none placeholder:text-txt-faint"
        />
      </div>
    </div>
  );
}

/**
 * Launch in two steps:
 *   1. Say (or type) who you want — e.g. "Noida mein 50 dentists chahiye".
 *      The AI builds a search plan: keywords, decision-maker titles, exclusions, seniority, location, count.
 *   2. Check / edit the plan, then Launch — n8n scrapes with it, and the CRM filters every result against it.
 */
export function LaunchCard({ automationReady }: { automationReady: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [brief, setBrief] = useState("");
  const [busy, setBusy] = useState<"review" | "launch" | null>(null);
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const [hint, setHint] = useState<string | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [readBy, setReadBy] = useState("");
  const rec = useRef<any>(null);
  const base = useRef("");

  useEffect(() => {
    setSupported(Boolean((window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition));
    return () => rec.current?.abort?.();
  }, []);

  function toggleMic() {
    if (listening) return rec.current?.stop();
    const C = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    if (!C) return setHint("Voice needs Chrome or Edge — type instead.");
    const r = new C();
    r.lang = "en-IN";
    r.interimResults = true;
    r.continuous = true;
    base.current = brief ? `${brief.trim()} ` : "";
    r.onresult = (e: any) => {
      let fin = "";
      let part = "";
      for (let i = e.resultIndex; i < e.results.length; i++) (e.results[i].isFinal ? (fin += e.results[i][0].transcript) : (part += e.results[i][0].transcript));
      if (fin) base.current += fin;
      setBrief((base.current + part).replace(/\s+/g, " ").trimStart());
      setPlan(null);
    };
    r.onerror = (e: any) => {
      setListening(false);
      setHint(e?.error === "not-allowed" ? "Allow microphone access, or type." : e?.error === "network" ? "This browser blocks voice (try Chrome or Edge), or type." : "Didn't catch that — try typing.");
    };
    r.onend = () => {
      setListening(false);
      if (base.current.trim().length >= 4) void review(base.current.trim());
    };
    rec.current = r;
    try {
      r.start();
      setListening(true);
      setHint(null);
      setPlan(null);
    } catch {
      setHint("Microphone unavailable — type instead.");
    }
  }

  async function review(text = brief.trim()) {
    if (text.length < 4) return setHint("Say who you want and where, e.g. “50 dentists in Noida”.");
    rec.current?.abort?.();
    setListening(false);
    setBusy("review");
    setHint(null);
    try {
      const r = await lg<{ plan: Plan; readBy: string }>("/launch/preview", { body: { transcript: text } });
      setPlan(r.plan);
      setReadBy(r.readBy);
    } catch (e) {
      setHint(e instanceof ApiError ? e.message : "Couldn't reach the server.");
    } finally {
      setBusy(null);
    }
  }

  async function launch() {
    if (!plan) return;
    setBusy("launch");
    setHint(null);
    try {
      const r = await lg<{ message: string; automation: string }>("/launch", { body: { transcript: brief.trim(), plan } });
      setBrief("");
      setPlan(null);
      r.automation === "started" ? toast.success("Campaign launched", r.message) : toast.error("Saved, but automation isn't running", r.message);
      router.refresh();
    } catch (e) {
      setHint(e instanceof ApiError ? e.message : "Couldn't reach the server.");
    } finally {
      setBusy(null);
    }
  }

  const missing = plan && (!plan.location.trim() || plan.lead_count < 1 || !plan.keywords.length);

  return (
    <div className="card p-5 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <span className="grid place-items-center w-8 h-8 rounded-lg bg-gold-soft text-gold-bright">
          <Icon name="Rocket" size={16} />
        </span>
        <h3 className="font-display font-bold">Launch a campaign</h3>
        <span className={`ml-auto text-xs font-semibold ${listening ? "text-red" : "text-txt-faint"}`}>
          {listening ? "Listening… tap the mic again when done" : automationReady ? "Ready" : "n8n not connected"}
        </span>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
        <button
          type="button"
          onClick={toggleMic}
          aria-pressed={listening}
          aria-label={listening ? "Stop recording" : "Start recording"}
          className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl transition ${listening ? "bg-red text-white" : "bg-gold text-[var(--on-gold)] hover:opacity-90"}`}
        >
          <Icon name={listening ? "Square" : "Mic"} size={19} />
        </button>
        <input
          value={brief}
          onChange={(e) => (setBrief(e.target.value), setPlan(null))}
          onKeyDown={(e) => e.key === "Enter" && (plan ? launch() : review())}
          className="input flex-1"
          placeholder={supported ? "Tap the mic and say it, or type: Noida mein 50 dentists chahiye" : "Type: 50 dentists in Noida"}
          aria-label="Campaign brief"
        />
        {!plan && (
          <button className="btn btn-primary justify-center" onClick={() => review()} disabled={busy !== null}>
            {busy === "review" ? <><Spinner /> Planning…</> : <>Build plan <Icon name="ArrowRight" size={15} /></>}
          </button>
        )}
      </div>

      {plan && (
        <div className="mt-4 rounded-xl border border-gold/40 bg-gold-soft/60 p-4" role="group" aria-label="Confirm campaign">
          <div className="flex flex-wrap items-baseline gap-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-gold-bright">Search plan</p>
            <span className="text-xs text-txt-faint">built by {readBy} · edit anything before launching</span>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_140px]">
            <label className="block">
              <span className="field-label">Looking for</span>
              <input className="input" value={plan.target} onChange={(e) => setPlan({ ...plan, target: e.target.value })} aria-label="Looking for" />
            </label>
            <label className="block">
              <span className="field-label">Location</span>
              <input className="input" value={plan.location} onChange={(e) => setPlan({ ...plan, location: e.target.value })} placeholder="City, State" aria-label="Area" />
            </label>
            <label className="block">
              <span className="field-label">How many</span>
              <input className="input" type="number" min={1} max={5000} value={plan.lead_count || ""} onChange={(e) => setPlan({ ...plan, lead_count: Math.max(0, Number(e.target.value) || 0) })} aria-label="Sellers to find" />
            </label>
          </div>
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            <Chips label="Search keywords" tone="gold" items={plan.keywords} onChange={(v) => setPlan({ ...plan, keywords: v })} placeholder="add keyword…" />
            <Chips label="Decision makers (job titles)" tone="green" items={plan.include_titles} onChange={(v) => setPlan({ ...plan, include_titles: v })} placeholder="add title…" />
            <Chips label="Prioritise seniority" tone="green" items={plan.seniority} onChange={(v) => setPlan({ ...plan, seniority: v })} placeholder="add level…" />
            <Chips label="Exclude (never import)" tone="red" items={plan.exclude_titles} onChange={(v) => setPlan({ ...plan, exclude_titles: v })} placeholder="add title to exclude…" />
          </div>
          {plan.notes && <p className="mt-3 text-xs text-txt-dim"><Icon name="Info" size={12} className="inline -mt-0.5" /> {plan.notes}</p>}
          <p className="mt-3 text-xs text-txt-dim">
            On launch n8n searches with this plan, and the CRM drops anyone matching an excluded title and ranks owners, founders and directors first.
            Then: email (Smartlead) → WhatsApp intro 2 hours later → the AI answers replies.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button className="btn btn-primary" onClick={launch} disabled={busy !== null || Boolean(missing)}>
              {busy === "launch" ? <><Spinner /> Launching…</> : <><Icon name="Rocket" size={15} /> Launch campaign</>}
            </button>
            <button className="btn" onClick={() => setPlan(null)} disabled={busy !== null}>Edit request</button>
            {missing && <span className="text-xs text-red">Add the location, how many, and at least one keyword.</span>}
          </div>
        </div>
      )}
      {hint && <p className="text-xs text-txt-dim mt-2" role="status">{hint}</p>}
    </div>
  );
}
