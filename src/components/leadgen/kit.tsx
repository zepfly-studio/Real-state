"use client";
import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";
import { stageMeta } from "@/lib/leadgen/stages";

/* ───────────────────────── fetch helper ───────────────────────── */

export class ApiError extends Error {
  constructor(public status: number, message: string, public code?: string) {
    super(message);
  }
}

/** Call a /api/leadgen route. Throws ApiError with the plain-language message the server wrote. */
export async function lg<T = any>(path: string, init?: { method?: string; body?: unknown; signal?: AbortSignal }): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api/leadgen${path}`, {
      method: init?.method ?? (init?.body !== undefined ? "POST" : "GET"),
      headers: init?.body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
      signal: init?.signal,
      cache: "no-store",
    });
  } catch (e: any) {
    if (e?.name === "AbortError") throw e;
    throw new ApiError(0, "Can't reach the server. Check your connection.");
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, data?.error || `Something went wrong (${res.status}).`, data?.code);
  return data as T;
}

/** Fetch on mount (and on `deps`), with loading / error / not-connected / refresh. */
export function useLg<T>(path: string | null, interval = 0) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(Boolean(path));
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!path) return;
    const ctrl = new AbortController();
    let alive = true;
    lg<T>(path, { signal: ctrl.signal })
      .then((d) => alive && (setData(d), setError(null)))
      .catch((e) => alive && e?.name !== "AbortError" && setError(e instanceof ApiError ? e : new ApiError(0, "Something went wrong.")))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
      ctrl.abort();
    };
  }, [path, tick]);

  useEffect(() => {
    if (!interval || !path) return;
    const id = setInterval(() => document.visibilityState === "visible" && setTick((n) => n + 1), interval);
    return () => clearInterval(id);
  }, [interval, path]);

  const refresh = useCallback(() => setTick((n) => n + 1), []);
  return { data, error, loading, refresh, notConnected: error?.code?.endsWith("_not_connected") ?? false };
}

/** Re-render the server data on an interval (only while the tab is visible). */
export function AutoRefresh({ seconds = 20 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => document.visibilityState === "visible" && router.refresh(), seconds * 1000);
    return () => clearInterval(id);
  }, [router, seconds]);
  return null;
}

/* ───────────────────────── toasts ───────────────────────── */

interface Toast {
  id: number;
  kind: "success" | "error";
  title: string;
  message?: string;
}
const ToastCtx = createContext<{ success: (t: string, m?: string) => void; error: (t: string, m?: string) => void } | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const id = useRef(0);
  const push = useCallback((kind: Toast["kind"], title: string, message?: string) => {
    const n = ++id.current;
    setItems((x) => [...x, { id: n, kind, title, message }]);
    setTimeout(() => setItems((x) => x.filter((t) => t.id !== n)), kind === "error" ? 8000 : 4000);
  }, []);
  const api = { success: (t: string, m?: string) => push("success", t, m), error: (t: string, m?: string) => push("error", t, m) };
  return (
    <ToastCtx.Provider value={api}>
      {children}
      <div className="fixed top-4 right-4 z-[70] flex flex-col gap-2 w-[min(360px,calc(100vw-2rem))]" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} role={t.kind === "error" ? "alert" : "status"} className="card p-3.5 flex items-start gap-3 shadow-lg animate-fade-in">
            <span className={t.kind === "error" ? "text-red" : "text-green"}>
              <Icon name={t.kind === "error" ? "CircleAlert" : "CircleCheck"} size={18} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold">{t.title}</div>
              {t.message && <div className="text-xs text-txt-dim mt-0.5 break-words">{t.message}</div>}
            </div>
            <button className="text-txt-faint hover:text-txt" onClick={() => setItems((x) => x.filter((y) => y.id !== t.id))} aria-label="Dismiss">
              <Icon name="X" size={15} />
            </button>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const c = useContext(ToastCtx);
  if (!c) throw new Error("useToast must be used inside <ToastProvider>");
  return c;
}

/* ───────────────────────── small building blocks ───────────────────────── */

export function Modal({ open, onClose, title, subtitle, children, wide }: { open: boolean; onClose: () => void; title: string; subtitle?: string; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-label={title} className={`card w-full ${wide ? "max-w-2xl" : "max-w-md"} max-h-[90vh] overflow-y-auto p-6 animate-fade-in`}>
        <div className="flex items-start gap-3 mb-4">
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-lg font-bold">{title}</h3>
            {subtitle && <p className="text-sm text-txt-dim mt-0.5">{subtitle}</p>}
          </div>
          <button className="text-txt-faint hover:text-txt" onClick={onClose} aria-label="Close">
            <Icon name="X" size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string | null; children: ReactNode }) {
  return (
    <div>
      <label className="field-label">{label}</label>
      {children}
      {error ? <p className="text-xs text-red mt-1">{error}</p> : hint ? <p className="text-xs text-txt-faint mt-1">{hint}</p> : null}
    </div>
  );
}

export function Segmented<T extends string>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: Array<{ value: T; label: string; count?: number }>; label: string }) {
  return (
    <div role="group" aria-label={label} className="inline-flex flex-wrap gap-1 rounded-xl bg-panel-2 p-1 border border-line">
      {options.map((o) => (
        <button
          key={o.value || "all"}
          type="button"
          aria-pressed={o.value === value}
          onClick={() => onChange(o.value)}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-semibold transition-colors ${
            o.value === value ? "bg-panel text-txt shadow-sm" : "text-txt-dim hover:text-txt"
          }`}
        >
          {o.label}
          {o.count !== undefined && <span className="text-[11px] text-txt-faint tabular-nums">{o.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function StageBadge({ value }: { value: string }) {
  const m = stageMeta(value);
  const tone: Record<string, string> = {
    neutral: "bg-panel-2 text-txt-dim",
    blue: "bg-[rgba(91,141,239,.14)] text-blue",
    purple: "bg-[rgba(155,126,240,.14)] text-purple",
    green: "bg-[rgba(62,199,141,.14)] text-green",
    red: "bg-[rgba(240,85,106,.14)] text-red",
    gold: "bg-gold-soft text-gold-bright",
  };
  return <span className={`tag ${tone[m.tone]}`}>{m.label}</span>;
}

export function Spinner({ className = "" }: { className?: string }) {
  return <span className={`inline-block h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin ${className}`} aria-hidden />;
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton rounded-lg ${className}`} />;
}

export function Avatar({ name, size = 36 }: { name?: string | null; size?: number }) {
  const t = (name || "?").trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?";
  return (
    <span className="grid place-items-center rounded-full bg-gold-soft text-gold-bright font-bold shrink-0" style={{ width: size, height: size, fontSize: size * 0.36 }}>
      {t}
    </span>
  );
}

export function ConnectCard({ icon, title, children, href = "/leadgen/setup", cta }: { icon: string; title: string; children: ReactNode; href?: string; cta: string }) {
  return (
    <div className="card border-dashed p-10 text-center">
      <div className="mx-auto grid place-items-center w-14 h-14 rounded-2xl bg-gold-soft text-gold-bright mb-4">
        <Icon name={icon} size={24} />
      </div>
      <h3 className="font-display text-lg font-bold">{title}</h3>
      <p className="text-sm text-txt-dim mt-1 max-w-md mx-auto">{children}</p>
      <a href={href} className="btn btn-primary mt-5 inline-flex">
        {cta}
        <Icon name="ArrowRight" size={15} />
      </a>
    </div>
  );
}

export function timeAgoIso(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(/[zZ]$|[+-]\d\d:?\d\d$/.test(iso) ? iso : `${iso}Z`);
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

/** Relative time that never causes a hydration mismatch (server and browser clocks differ by seconds). */
export function Ago({ iso }: { iso?: string | null }) {
  return <span suppressHydrationWarning>{timeAgoIso(iso)}</span>;
}

export const num = (n: number | undefined | null) => (n ?? 0).toLocaleString("en-IN");
