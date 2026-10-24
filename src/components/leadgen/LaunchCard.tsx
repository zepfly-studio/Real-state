"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";
import { ApiError, lg, Spinner, useToast } from "./kit";

/** Say or type who to find and where, then launch. Gemini reads the brief; n8n does the scraping and outreach. */
export function LaunchCard({ automationReady }: { automationReady: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [brief, setBrief] = useState("");
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const [hint, setHint] = useState<string | null>(null);
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
    };
    r.onerror = (e: any) => {
      setListening(false);
      setHint(e?.error === "not-allowed" ? "Allow microphone access, or type the brief." : e?.error === "network" ? "This browser blocks voice (try Chrome or Edge), or type the brief." : "Didn't catch that — try typing.");
    };
    r.onend = () => setListening(false);
    rec.current = r;
    try {
      r.start();
      setListening(true);
      setHint(null);
    } catch {
      setHint("Microphone unavailable — type the brief.");
    }
  }

  async function launch() {
    if (brief.trim().length < 5) return setHint("Describe the area and how many sellers you want.");
    rec.current?.abort?.();
    setListening(false);
    setBusy(true);
    setHint(null);
    try {
      const r = await lg<{ message: string; automation: string }>("/launch", { body: { transcript: brief.trim() } });
      setBrief("");
      r.automation === "started" ? toast.success("Campaign launched", r.message) : toast.error("Saved, but automation isn't running", r.message);
      router.refresh();
    } catch (e) {
      setHint(e instanceof ApiError ? e.message : "Couldn't reach the server.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card p-5 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <span className="grid place-items-center w-8 h-8 rounded-lg bg-gold-soft text-gold-bright">
          <Icon name="Rocket" size={16} />
        </span>
        <h3 className="font-display font-bold">Launch a campaign</h3>
        <span className={`ml-auto text-xs font-semibold ${listening ? "text-red" : "text-txt-faint"}`}>{listening ? "Listening…" : automationReady ? "Ready" : "n8n not connected"}</span>
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
          onChange={(e) => setBrief(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && launch()}
          className="input flex-1"
          placeholder={supported ? "Tap the mic, or type: find 50 sellers in Mansarovar" : "Type: find 50 sellers in Mansarovar"}
          aria-label="Campaign brief"
        />
        <button className="btn btn-primary justify-center" onClick={launch} disabled={busy}>
          {busy ? <><Spinner /> Launching…</> : <>Launch campaign <Icon name="ArrowRight" size={15} /></>}
        </button>
      </div>
      {hint && <p className="text-xs text-txt-dim mt-2" role="status">{hint}</p>}
    </div>
  );
}
