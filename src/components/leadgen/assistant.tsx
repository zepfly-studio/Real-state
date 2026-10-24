"use client";
import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";
import { ApiError, lg, Spinner } from "./kit";

/**
 * Gemini voice assistant — browser side.
 * Speech in/out uses the browser's own engines (no extra key). Understanding and tool use happen on the
 * server with the workspace's Gemini key. The assistant never sends or changes anything by itself:
 * it proposes, the person says "yes" (or taps Confirm), and only then does /execute run.
 */

interface ChatMsg {
  id: number;
  role: "user" | "assistant";
  content: string;
  tone?: "error" | "success";
}
interface Pending {
  tool: string;
  args: Record<string, unknown>;
  title: string;
  preview: string;
}

const YES = /^\s*(yes|yeah|yep|yup|sure|ok|okay|confirm|confirmed|go ahead|send|send it|do it|please do|approve|haan|ha|kar do|theek hai)\b/i;
const NO = /^\s*(no|nope|cancel|stop|don'?t|do not|never ?mind|not now|discard|nahi|mat karo|ruko)\b/i;

function newRecognition(): any | null {
  if (typeof window === "undefined") return null;
  const C = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
  return C ? new C() : null;
}

interface State {
  open: boolean;
  messages: ChatMsg[];
  busy: boolean;
  listening: boolean;
  speaking: boolean;
  interim: string;
  pending: Pending[];
  connected: boolean | null;
  muted: boolean;
  voiceSupported: boolean;
  setOpen: (o: boolean) => void;
  toggleMic: () => void;
  send: (t: string) => void;
  confirm: () => void;
  cancel: () => void;
  setMuted: (m: boolean) => void;
  clear: () => void;
}
const Ctx = createContext<State | null>(null);
export const useAssistant = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAssistant must be used inside <AssistantProvider>");
  return c;
};

export function AssistantProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpenState] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [interim, setInterim] = useState("");
  const [pending, setPending] = useState<Pending[]>([]);
  const [connected, setConnected] = useState<boolean | null>(null);
  const [muted, setMutedState] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(true);

  const rec = useRef<any>(null);
  const heard = useRef("");
  const idRef = useRef(0);
  const live = useRef({ messages, pending, busy, pathname, muted, listening });
  live.current = { messages, pending, busy, pathname, muted, listening };

  useEffect(() => {
    setVoiceSupported(Boolean(newRecognition()));
    try {
      setMutedState(localStorage.getItem("lg-assistant-muted") === "1");
    } catch {
      /* private mode */
    }
  }, []);

  const loadStatus = useCallback(() => {
    lg<{ connected: boolean }>("/assistant/status").then((s) => setConnected(s.connected)).catch(() => setConnected(null));
  }, []);
  useEffect(loadStatus, [loadStatus]);

  const add = useCallback((role: ChatMsg["role"], content: string, tone?: ChatMsg["tone"]) => {
    setMessages((m) => [...m, { id: ++idRef.current, role, content, tone }]);
  }, []);

  /* speech out */
  const stopSpeaking = useCallback(() => {
    try {
      window.speechSynthesis?.cancel();
    } catch {
      /* unsupported */
    }
    setSpeaking(false);
  }, []);
  const speak = useCallback((text: string, then?: () => void) => {
    if (live.current.muted || typeof window === "undefined" || !window.speechSynthesis) return void then?.();
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text.replace(/[*_`#]/g, ""));
      u.lang = "en-IN";
      u.rate = 1.03;
      u.onstart = () => setSpeaking(true);
      u.onend = () => (setSpeaking(false), then?.());
      u.onerror = () => (setSpeaking(false), then?.());
      window.speechSynthesis.speak(u);
    } catch {
      then?.();
    }
  }, []);

  /* speech in */
  const stopListening = useCallback(() => {
    try {
      rec.current?.abort();
    } catch {
      /* already stopped */
    }
    rec.current = null;
    setListening(false);
    setInterim("");
  }, []);

  const sendRef = useRef<(t: string) => void>(() => {});

  const listen = useCallback(() => {
    const r = newRecognition();
    if (!r) {
      add("assistant", "This browser can't hear you. Open the dashboard in Chrome or Edge to talk, or type below.", "error");
      return;
    }
    stopSpeaking();
    heard.current = "";
    r.lang = "en-IN";
    r.interimResults = true;
    r.continuous = false;
    r.onresult = (e: any) => {
      let fin = "";
      let part = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const x = e.results[i];
        if (x.isFinal) fin += x[0].transcript;
        else part += x[0].transcript;
      }
      if (fin) heard.current += fin;
      setInterim((heard.current + part).trim());
    };
    r.onerror = (e: any) => {
      const code = e?.error;
      if (code === "no-speech" || code === "aborted") return;
      add(
        "assistant",
        code === "not-allowed"
          ? "Microphone access is blocked. Allow it in the address bar, or type below."
          : code === "network"
            ? "This browser can't process voice (Brave and some others block it). Use Chrome or Edge, or type below."
            : "I couldn't hear that. Try again or type.",
        "error"
      );
    };
    r.onend = () => {
      rec.current = null;
      setListening(false);
      setInterim("");
      const said = heard.current.trim();
      heard.current = "";
      if (said) sendRef.current(said);
    };
    rec.current = r;
    try {
      r.start();
      setListening(true);
    } catch {
      setListening(false);
    }
  }, [add, stopSpeaking]);

  const toggleMic = useCallback(() => {
    if (live.current.listening) {
      try {
        rec.current?.stop();
      } catch {
        stopListening();
      }
    } else {
      setOpenState(true);
      listen();
    }
  }, [listen, stopListening]);

  /* actions */
  const runPending = useCallback(
    async (actions: Pending[]) => {
      setBusy(true);
      const done: string[] = [];
      let failed = false;
      for (const a of actions) {
        try {
          const r = await lg<{ message: string }>("/assistant/execute", { body: { tool: a.tool, args: a.args } });
          done.push(r.message);
        } catch (err) {
          failed = true;
          done.push(err instanceof ApiError ? err.message : "That didn't go through.");
          break;
        }
      }
      setBusy(false);
      setPending([]);
      const text = done.join(" ");
      add("assistant", text, failed ? "error" : "success");
      speak(text);
      router.refresh();
    },
    [add, speak, router]
  );

  const confirm = useCallback(() => {
    const p = live.current.pending;
    if (p.length && !live.current.busy) {
      stopSpeaking();
      stopListening();
      void runPending(p);
    }
  }, [runPending, stopSpeaking, stopListening]);

  const cancel = useCallback(() => {
    if (!live.current.pending.length) return;
    setPending([]);
    stopSpeaking();
    stopListening();
    add("assistant", "Okay, I cancelled that. Nothing was sent.");
    speak("Okay, cancelled.");
  }, [add, speak, stopSpeaking, stopListening]);

  const send = useCallback(
    async (raw: string) => {
      const text = raw.trim();
      if (!text || live.current.busy) return;
      stopSpeaking();
      stopListening();
      add("user", text);

      if (live.current.pending.length) {
        if (YES.test(text)) return void runPending(live.current.pending);
        if (NO.test(text)) {
          setPending([]);
          add("assistant", "Okay, cancelled. Nothing was sent.");
          return speak("Okay, cancelled.");
        }
        setPending([]); // anything else replaces the old proposal
      }

      setBusy(true);
      try {
        const history = [...live.current.messages, { id: 0, role: "user" as const, content: text }]
          .filter((m) => m.tone !== "error")
          .map((m) => ({ role: m.role, content: m.content }));
        const res = await lg<{ reply: string; pending: Pending[]; ui: Array<{ navigate?: string }> }>("/assistant/chat", {
          body: { messages: history, page: live.current.pathname },
        });
        setConnected(true);
        add("assistant", res.reply);
        for (const u of res.ui) if (u.navigate) router.push(u.navigate);
        setPending(res.pending);
        // After a proposal, keep the mic open so "yes" works hands-free.
        speak(res.reply, res.pending.length && !live.current.listening ? () => listen() : undefined);
      } catch (err) {
        if (err instanceof ApiError && err.code === "assistant_not_connected") setConnected(false);
        else add("assistant", err instanceof ApiError ? err.message : "I couldn't reach the server.", "error");
      } finally {
        setBusy(false);
      }
    },
    [add, listen, router, runPending, speak, stopListening, stopSpeaking]
  );
  sendRef.current = send;

  const setOpen = useCallback(
    (o: boolean) => {
      setOpenState(o);
      if (!o) {
        stopListening();
        stopSpeaking();
      } else loadStatus();
    },
    [loadStatus, stopListening, stopSpeaking]
  );
  const setMuted = useCallback(
    (m: boolean) => {
      setMutedState(m);
      if (m) stopSpeaking();
      try {
        localStorage.setItem("lg-assistant-muted", m ? "1" : "0");
      } catch {
        /* ignore */
      }
    },
    [stopSpeaking]
  );
  const clear = useCallback(() => (setMessages([]), setPending([])), []);

  // Shift + D (or Shift + M) anywhere outside a text field talks to the assistant.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) return setOpen(false);
      if (!e.shiftKey || e.ctrlKey || e.altKey || e.metaKey) return;
      if (e.code !== "KeyD" && e.code !== "KeyM") return;
      const t = e.target as HTMLElement | null;
      if (t && (["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName) || t.isContentEditable)) return;
      e.preventDefault();
      toggleMic();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen, toggleMic]);

  const value: State = { open, messages, busy, listening, speaking, interim, pending, connected, muted, voiceSupported, setOpen, toggleMic, send: (t) => void send(t), confirm, cancel, setMuted, clear };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/* ───────────────────────── UI ───────────────────────── */

const SUGGESTIONS = ["How many leads do I have?", "Reply to the follow-ups we received", "Show me the interested leads", "Launch a campaign for 30 sellers in Mansarovar"];

function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="rounded border border-line bg-panel-2 px-1.5 py-0.5 font-mono text-[10px] text-txt-faint">{children}</kbd>;
}

/** Floating button — opens the assistant from any Lead Generation page. */
export function AssistantLauncher() {
  const a = useAssistant();
  if (a.open) return null;
  return (
    <button
      type="button"
      onClick={a.toggleMic}
      aria-label="Open voice assistant (Shift + D)"
      className="fixed bottom-5 right-5 z-40 flex items-center gap-2.5 rounded-full bg-[var(--txt)] text-[var(--bg)] py-2.5 pl-3 pr-4 text-sm font-semibold shadow-lg hover:opacity-90 transition"
    >
      <span className="grid h-8 w-8 place-items-center rounded-full bg-gold text-[var(--on-gold)]">
        <Icon name="Mic" size={16} />
      </span>
      <span className="hidden sm:inline">Ask assistant</span>
      <span className="hidden sm:inline rounded bg-white/20 px-1.5 py-0.5 font-mono text-[10px]">⇧ D</span>
    </button>
  );
}

export function AssistantPanel() {
  const a = useAssistant();
  const [text, setText] = useState("");
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [a.messages, a.interim, a.pending.length, a.busy, a.open]);
  if (!a.open) return null;

  const status = a.listening ? "Listening…" : a.speaking ? "Speaking…" : a.busy ? "Working on it…" : a.connected ? "Gemini · ready" : "Not connected";

  return (
    <section
      role="dialog"
      aria-label="Voice assistant"
      className="fixed inset-x-3 bottom-3 z-50 flex max-h-[min(720px,calc(100dvh-1.5rem))] flex-col overflow-hidden rounded-2xl border border-line bg-panel shadow-2xl sm:inset-x-auto sm:bottom-5 sm:right-5 sm:w-[410px]"
    >
      <header className="flex items-center gap-3 border-b border-line bg-[var(--txt)] px-4 py-3 text-[var(--bg)]">
        <span className={`grid h-9 w-9 place-items-center rounded-full bg-white/15 ${a.speaking ? "animate-pulse" : ""}`}>
          <Icon name="Sparkles" size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold leading-tight">Your assistant</h2>
          <p className="truncate text-xs opacity-70" role="status">{status}</p>
        </div>
        <button type="button" onClick={() => a.setMuted(!a.muted)} aria-label={a.muted ? "Turn voice replies on" : "Mute voice replies"} className="rounded-lg p-1.5 opacity-70 hover:opacity-100 hover:bg-white/10">
          <Icon name={a.muted ? "VolumeX" : "Volume2"} size={16} />
        </button>
        {a.messages.length > 0 && (
          <button type="button" onClick={a.clear} aria-label="Clear conversation" className="rounded-lg p-1.5 opacity-70 hover:opacity-100 hover:bg-white/10">
            <Icon name="Trash2" size={16} />
          </button>
        )}
        <button type="button" onClick={() => a.setOpen(false)} aria-label="Close assistant" className="rounded-lg p-1.5 opacity-70 hover:opacity-100 hover:bg-white/10">
          <Icon name="X" size={16} />
        </button>
      </header>

      <div className="min-h-[200px] flex-1 space-y-3 overflow-y-auto bg-bg-2/60 px-4 py-4">
        {a.connected === false ? (
          <div className="card border-dashed p-5 text-center">
            <span className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-gold-soft text-gold-bright">
              <Icon name="PlugZap" size={19} />
            </span>
            <h3 className="mt-3 text-sm font-semibold">Switch the assistant on</h3>
            <p className="mt-1 text-[13px] leading-relaxed text-txt-dim">Paste your Gemini API key once under Lead Generation → Setup. After that you can just talk to it.</p>
            <Link href="/leadgen/setup" onClick={() => a.setOpen(false)} className="btn btn-primary mt-4 inline-flex">
              Go to Setup
            </Link>
          </div>
        ) : (
          <>
            {!a.messages.some((m) => m.role === "user") && (
              <div>
                <p className="text-[13px] leading-relaxed text-txt-dim">
                  Hi! Press the mic and tell me what to do. I can look up leads, answer follow-ups, launch campaigns and open any page. I always ask before I send or change anything.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button key={s} type="button" onClick={() => a.send(s)} className="rounded-full border border-line bg-panel px-3 py-1.5 text-left text-xs font-medium text-txt-dim hover:text-gold-bright hover:border-gold">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {a.messages.map((m) => (
              <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <p
                  className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-[13px] leading-relaxed ${
                    m.role === "user"
                      ? "rounded-br-md bg-gold text-[var(--on-gold)] font-medium"
                      : m.tone === "error"
                        ? "rounded-bl-md border border-red/30 bg-[rgba(240,85,106,.10)] text-red"
                        : m.tone === "success"
                          ? "rounded-bl-md border border-green/30 bg-[rgba(62,199,141,.10)] text-green"
                          : "rounded-bl-md border border-line bg-panel"
                  }`}
                >
                  {m.content}
                </p>
              </div>
            ))}
          </>
        )}
        {a.interim && (
          <div className="flex justify-end">
            <p className="max-w-[85%] rounded-2xl rounded-br-md bg-gold-soft px-3.5 py-2 text-[13px] italic text-gold-bright">{a.interim}…</p>
          </div>
        )}
        {a.busy && (
          <div className="flex items-center gap-2 text-xs text-txt-dim">
            <Spinner /> Thinking…
          </div>
        )}
        {a.pending.length > 0 && !a.busy && (
          <div className="rounded-xl border border-gold/40 bg-gold-soft p-3.5" role="group" aria-label="Needs your approval">
            <p className="text-[11px] font-bold uppercase tracking-wider text-gold-bright">Needs your OK</p>
            <ul className="mt-2 space-y-2.5">
              {a.pending.map((p, i) => (
                <li key={i}>
                  <p className="text-[13px] font-semibold">{p.title}</p>
                  <p className="mt-1 whitespace-pre-wrap rounded-lg border border-line bg-panel px-3 py-2 text-[13px] leading-relaxed">{p.preview}</p>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex items-center gap-2">
              <button className="btn btn-primary" onClick={a.confirm}>
                <Icon name="Check" size={15} /> Confirm
              </button>
              <button className="btn" onClick={a.cancel}>Cancel</button>
              <span className="ml-auto text-[11px] text-txt-faint">or say “yes” / “no”</span>
            </div>
          </div>
        )}
        <div ref={end} />
      </div>

      {a.connected !== false && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!text.trim()) return;
            a.send(text);
            setText("");
          }}
          className="flex items-center gap-2 border-t border-line bg-panel p-3"
        >
          <button
            type="button"
            onClick={a.toggleMic}
            aria-pressed={a.listening}
            aria-label={a.listening ? "Stop listening" : "Start talking"}
            className={`relative grid h-11 w-11 shrink-0 place-items-center rounded-full text-white transition ${a.listening ? "bg-red" : "bg-gold !text-[var(--on-gold)]"}`}
          >
            {a.listening && <span className="absolute inset-0 animate-ping rounded-full bg-red/40" aria-hidden />}
            <span className="relative"><Icon name={a.listening ? "Square" : "Mic"} size={17} /></span>
          </button>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={a.voiceSupported ? "Say it, or type here…" : "Type here…"}
            aria-label="Message the assistant"
            className="input flex-1"
          />
          <button type="submit" className="btn btn-primary !px-3" aria-label="Send" disabled={!text.trim() || a.busy}>
            <Icon name="Send" size={16} />
          </button>
        </form>
      )}
      <p className="border-t border-line-soft bg-panel px-4 py-2 text-center text-[11px] text-txt-faint">
        Press <Kbd>Shift</Kbd> + <Kbd>D</Kbd> anywhere to talk · <Kbd>Esc</Kbd> to close
      </p>
    </section>
  );
}
