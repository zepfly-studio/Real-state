"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";
import { ApiError, lg, Spinner, useToast } from "./kit";

interface Preview {
  location: string;
  leadCount: number;
  name: string;
  readBy: string;
}

/**
 * Launch in two steps, as specified:
 *   1. Say (or type) the campaign — ChatGPT reads it and shows what it understood.
 *   2. Check / edit that, then press Launch — n8n takes over (scrape → email → WhatsApp → AI replies).
 */
export function LaunchCard({ automationReady }: { automationReady: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [brief, setBrief] = useState("");
  const [busy, setBusy] = useState<"review" | "launch" | null>(null);
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const [hint, setHint] = useState<string | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const rec = useRef<any>(null);
  const base = useRef("");

  useEffect(() => {
    setSupported(Boolean((window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition));
    return () => rec.current?.abort?.();
  }, []);

  function toggleMic() {
    if (listening) {
      rec.current?.stop();
      return;
    }
    const C = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    if (!C) return setHint("Voice needs Chrome or Edge — type the brief instead.");
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
      setPreview(null);
    };
    r.onerror = (e: any) => {
      setListening(false);
      setHint(e?.error === "not-allowed" ? "Allow microphone access, or type the brief." : e?.error === "network" ? "This browser blocks voice (try Chrome or Edge), or type the brief." : "Didn't catch that — try typing.");
    };
    r.onend = () => {
      setListening(false);
      // Spoken brief finished: go straight to "here's what I understood".
      if (base.current.trim().length >= 5) void review(base.current.trim());
    };
    rec.current = r;
    try {
      r.start();
      setListening(true);
      setHint(null);
      setPreview(null);
    } catch {
      setHint("Microphone unavailable — type the brief.");
    }
  }

  async function review(text = brief.trim()) {
    if (text.length < 5) return setHint("Describe the area and how many sellers you want.");
    rec.current?.abort?.();
    setListening(false);
    setBusy("review");
    setHint(null);
    try {
      setPreview(await lg<Preview>("/launch/preview", { body: { transcript: text } }));
    } catch (e) {
      setHint(e instanceof ApiError ? e.message : "Couldn't reach the server.");
    } finally {
      setBusy(null);
    }
  }

  async function launch() {
    if (!preview) return;
    setBusy("launch");
    setHint(null);
    try {
      const r = await lg<{ message: string; automation: string }>("/launch", {
        body: { transcript: brief.trim(), location: preview.location, lead_count: preview.leadCount },
      });
      setBrief("");
      setPreview(null);
      r.automation === "started" ? toast.success("Campaign launched", r.message) : toast.error("Saved, but automation isn't running", r.message);
      router.refresh();
    } catch (e) {
      setHint(e instanceof ApiError ? e.message : "Couldn't reach the server.");
    } finally {
      setBusy(null);
    }
  }

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
          onChange={(e) => (setBrief(e.target.value), setPreview(null))}
          onKeyDown={(e) => e.key === "Enter" && (preview ? launch() : review())}
          className="input flex-1"
          placeholder={supported ? "Tap the mic and say it, or type: find 50 sellers in Mansarovar" : "Type: find 50 sellers in Mansarovar"}
          aria-label="Campaign brief"
        />
        {!preview && (
          <button className="btn btn-primary justify-center" onClick={() => review()} disabled={busy !== null}>
            {busy === "review" ? <><Spinner /> Reading…</> : <>Review <Icon name="ArrowRight" size={15} /></>}
          </button>
        )}
      </div>

      {preview && (
        <div className="mt-4 rounded-xl border border-gold/40 bg-gold-soft p-4" role="group" aria-label="Confirm campaign">
          <p className="text-[11px] font-bold uppercase tracking-wider text-gold-bright">
            Here&apos;s what I understood <span className="font-normal normal-case tracking-normal text-txt-faint">· read by {preview.readBy}</span>
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_160px]">
            <label className="block">
              <span className="field-label">Area</span>
              <input className="input" value={preview.location} onChange={(e) => setPreview({ ...preview, location: e.target.value })} placeholder="Which area?" aria-label="Area" />
            </label>
            <label className="block">
              <span className="field-label">Sellers to find</span>
              <input className="input" type="number" min={1} max={5000} value={preview.leadCount || ""} onChange={(e) => setPreview({ ...preview, leadCount: Math.max(0, Number(e.target.value) || 0) })} aria-label="Sellers to find" />
            </label>
          </div>
          <p className="mt-3 text-xs text-txt-dim">
            On launch: sellers are found and saved here, emailed through Smartlead, sent a WhatsApp intro 2 hours later, and the AI answers their replies.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button className="btn btn-primary" onClick={launch} disabled={busy !== null || !preview.location.trim() || preview.leadCount < 1}>
              {busy === "launch" ? <><Spinner /> Launching…</> : <><Icon name="Rocket" size={15} /> Launch campaign</>}
            </button>
            <button className="btn" onClick={() => setPreview(null)} disabled={busy !== null}>Edit brief</button>
            {(!preview.location.trim() || preview.leadCount < 1) && <span className="text-xs text-red">Add the area and how many sellers.</span>}
          </div>
        </div>
      )}
      {hint && <p className="text-xs text-txt-dim mt-2" role="status">{hint}</p>}
    </div>
  );
}
