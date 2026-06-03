"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader, Card, Badge } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { inrFull, inr } from "@/lib/format";
import { Check, X, Loader2, Save, Plug } from "lucide-react";

interface IntegrationView {
  name: string;
  label: string;
  description: string;
  connected: boolean;
  source: string;
  masked: string;
}
interface Props {
  tenant: Record<string, string>;
  integrations: IntegrationView[];
  settings: Record<string, string>;
  users: { id: string; name: string; color: string }[];
  targets: { userId: string; value: number }[];
  month: string;
}

const TABS = [
  { key: "company", label: "Company / White-Label", icon: "Palette" },
  { key: "integrations", label: "Integrations", icon: "Plug" },
  { key: "notifications", label: "Notifications", icon: "Bell" },
  { key: "targets", label: "Targets", icon: "Target" },
];

export function SettingsClient({ tenant, integrations, settings, users, targets, month }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState("company");

  return (
    <div>
      <PageHeader title="Settings" subtitle="Configure your workspace, branding, integrations and targets." icon="Settings" />

      <div className="flex flex-wrap gap-1 mb-6 border-b border-line">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${
              tab === t.key ? "border-gold text-gold-bright" : "border-transparent text-txt-dim hover:text-txt"
            }`}
          >
            <Icon name={t.icon} size={15} /> {t.label}
          </button>
        ))}
      </div>

      {tab === "company" && <CompanyTab tenant={tenant} settings={settings} onSaved={() => router.refresh()} />}
      {tab === "integrations" && <IntegrationsTab integrations={integrations} onSaved={() => router.refresh()} />}
      {tab === "notifications" && <NotificationsTab settings={settings} onSaved={() => router.refresh()} />}
      {tab === "targets" && <TargetsTab users={users} targets={targets} month={month} onSaved={() => router.refresh()} />}
    </div>
  );
}

function CompanyTab({ tenant, settings, onSaved }: { tenant: Record<string, string>; settings: Record<string, string>; onSaved: () => void }) {
  const [f, setF] = useState<Record<string, string>>({ ...tenant, tagline: settings["company.tagline"] ?? "" });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const set = (k: string, v: string) => setF((s) => ({ ...s, [k]: v }));

  async function save() {
    setBusy(true);
    setMsg("");
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tenant: { name: f.name, logoUrl: f.logoUrl, faviconUrl: f.faviconUrl, brandPrimary: f.brandPrimary, brandAccent: f.brandAccent, domain: f.domain, reraNo: f.reraNo, gstNo: f.gstNo, address: f.address },
        settings: { "company.tagline": f.tagline },
      }),
    });
    setBusy(false);
    if (res.ok) {
      setMsg("Saved! Branding applied.");
      document.documentElement.style.setProperty("--gold", f.brandPrimary);
      onSaved();
    } else {
      const j = await res.json().catch(() => ({}));
      setMsg(j.error || "Failed to save");
    }
  }

  return (
    <div className="grid lg:grid-cols-3 gap-5">
      <div className="lg:col-span-2 space-y-5">
        <Card className="p-5">
          <h3 className="font-display font-bold mb-4">Brand Identity</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2"><label className="field-label">Company name</label><input className="input" value={f.name} onChange={(e) => set("name", e.target.value)} /></div>
            <div><label className="field-label">Logo URL</label><input className="input" value={f.logoUrl} onChange={(e) => set("logoUrl", e.target.value)} placeholder="https://…/logo.png" /></div>
            <div><label className="field-label">Favicon URL</label><input className="input" value={f.faviconUrl} onChange={(e) => set("faviconUrl", e.target.value)} placeholder="https://…/favicon.ico" /></div>
            <div>
              <label className="field-label">Primary brand colour</label>
              <div className="flex gap-2"><input type="color" value={f.brandPrimary} onChange={(e) => set("brandPrimary", e.target.value)} className="w-12 h-10 rounded-lg border border-line bg-transparent cursor-pointer" /><input className="input" value={f.brandPrimary} onChange={(e) => set("brandPrimary", e.target.value)} /></div>
            </div>
            <div>
              <label className="field-label">Accent colour</label>
              <div className="flex gap-2"><input type="color" value={f.brandAccent} onChange={(e) => set("brandAccent", e.target.value)} className="w-12 h-10 rounded-lg border border-line bg-transparent cursor-pointer" /><input className="input" value={f.brandAccent} onChange={(e) => set("brandAccent", e.target.value)} /></div>
            </div>
            <div className="sm:col-span-2"><label className="field-label">Tagline</label><input className="input" value={f.tagline} onChange={(e) => set("tagline", e.target.value)} /></div>
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="font-display font-bold mb-4">Company & Compliance</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <div><label className="field-label">Subdomain</label><input className="input opacity-70" value={f.subdomain} disabled /></div>
            <div><label className="field-label">Custom domain</label><input className="input" value={f.domain} onChange={(e) => set("domain", e.target.value)} placeholder="app.yourcompany.com" /></div>
            <div><label className="field-label">RERA number</label><input className="input" value={f.reraNo} onChange={(e) => set("reraNo", e.target.value)} /></div>
            <div><label className="field-label">GST number</label><input className="input" value={f.gstNo} onChange={(e) => set("gstNo", e.target.value)} /></div>
            <div className="sm:col-span-2"><label className="field-label">Registered address</label><input className="input" value={f.address} onChange={(e) => set("address", e.target.value)} /></div>
          </div>
        </Card>

        <div className="flex items-center gap-3">
          <button className="btn btn-primary" onClick={save} disabled={busy}>{busy ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save changes</button>
          {msg && <span className="text-sm text-green">{msg}</span>}
        </div>
      </div>

      {/* Live preview */}
      <div>
        <Card className="p-5 sticky top-20">
          <div className="section-label mb-3">Live preview</div>
          <div className="flex items-center gap-3 mb-4 p-3 rounded-xl bg-bg-2">
            <div className="grid place-items-center w-10 h-10 rounded-[10px] font-display font-extrabold text-[#1a1205]" style={{ background: `linear-gradient(180deg, ${f.brandAccent}, ${f.brandPrimary})` }}>{(f.name || "R").charAt(0)}</div>
            <div><div className="font-display font-bold text-sm">{f.name || "Company"}</div><div className="text-[11px] text-txt-faint">{f.tagline || "Creative Sharks"}</div></div>
          </div>
          <button className="w-full rounded-lg py-2.5 font-semibold text-sm text-[#1a1205] mb-2" style={{ background: f.brandPrimary }}>Primary button</button>
          <div className="h-2 rounded-full mb-2" style={{ background: f.brandAccent }} />
          <p className="text-xs text-txt-faint">This is how your brand colour reskins the platform for this tenant.</p>
        </Card>
      </div>
    </div>
  );
}

function IntegrationsTab({ integrations, onSaved }: { integrations: IntegrationView[]; onSaved: () => void }) {
  return (
    <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
      {integrations.map((i) => (
        <IntegrationCard key={i.name} integration={i} onSaved={onSaved} />
      ))}
    </div>
  );
}

function IntegrationCard({ integration, onSaved }: { integration: IntegrationView; onSaved: () => void }) {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [connected, setConnected] = useState(integration.connected);

  async function save(disconnect = false) {
    setBusy(true);
    const res = await fetch("/api/integrations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: integration.name, value: disconnect ? "" : value }),
    });
    setBusy(false);
    if (res.ok) {
      const j = await res.json();
      setConnected(j.connected);
      setValue("");
      onSaved();
    }
  }

  return (
    <Card className="p-5 flex flex-col">
      <div className="flex items-start justify-between mb-2">
        <div className="grid place-items-center w-9 h-9 rounded-lg bg-gold-soft text-gold-bright"><Plug size={16} /></div>
        {connected ? (
          <span className="tag bg-[rgba(62,199,141,.14)] text-green"><Check size={11} /> {integration.source === "env" ? "Via .env" : "Connected"}</span>
        ) : (
          <span className="tag bg-panel-2 text-txt-dim"><X size={11} /> Not connected</span>
        )}
      </div>
      <div className="font-display font-bold">{integration.label}</div>
      <p className="text-xs text-txt-dim mt-1 mb-3 flex-1">{integration.description}</p>
      {integration.masked && !value && <div className="text-[11px] text-txt-faint mb-2 font-mono">{integration.masked}</div>}
      <input
        className="input mb-2"
        type="password"
        placeholder={connected ? "Enter new key to replace…" : "Paste API key / token…"}
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <div className="flex gap-2">
        <button className="btn btn-primary flex-1 justify-center text-sm" onClick={() => save(false)} disabled={busy || !value}>{busy ? <Loader2 size={14} className="animate-spin" /> : "Save"}</button>
        {connected && integration.source === "tenant" && <button className="btn btn-ghost text-sm" onClick={() => save(true)} disabled={busy}>Disconnect</button>}
      </div>
    </Card>
  );
}

function NotificationsTab({ settings, onSaved }: { settings: Record<string, string>; onSaved: () => void }) {
  const [prefs, setPrefs] = useState({
    "notify.email": settings["notify.email"] === "true",
    "notify.whatsapp": settings["notify.whatsapp"] === "true",
    "notify.sms": settings["notify.sms"] === "true",
    "notify.newLead": settings["notify.newLead"] !== "false",
    "notify.booking": settings["notify.booking"] !== "false",
    "notify.approval": settings["notify.approval"] !== "false",
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function save() {
    setBusy(true);
    const payload: Record<string, string> = {};
    Object.entries(prefs).forEach(([k, v]) => (payload[k] = String(v)));
    const res = await fetch("/api/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ settings: payload }) });
    setBusy(false);
    if (res.ok) { setMsg("Preferences saved."); onSaved(); }
  }

  const CHANNELS = [["notify.email", "Email", "Send notifications by email (needs SMTP)"], ["notify.whatsapp", "WhatsApp", "Send alerts on WhatsApp (needs WhatsApp API)"], ["notify.sms", "SMS", "Text-message alerts (needs SMS gateway)"]];
  const EVENTS = [["notify.newLead", "New lead assigned"], ["notify.booking", "Booking created"], ["notify.approval", "Approval requested"]];

  return (
    <div className="grid lg:grid-cols-2 gap-5 max-w-4xl">
      <Card className="p-5">
        <h3 className="font-display font-bold mb-4">Channels</h3>
        <div className="space-y-3">
          {CHANNELS.map(([key, label, hint]) => (
            <Toggle key={key} label={label} hint={hint} on={(prefs as any)[key]} onChange={(v) => setPrefs((p) => ({ ...p, [key]: v }))} />
          ))}
        </div>
      </Card>
      <Card className="p-5">
        <h3 className="font-display font-bold mb-4">Notify me about</h3>
        <div className="space-y-3">
          {EVENTS.map(([key, label]) => (
            <Toggle key={key} label={label} on={(prefs as any)[key]} onChange={(v) => setPrefs((p) => ({ ...p, [key]: v }))} />
          ))}
        </div>
      </Card>
      <div className="flex items-center gap-3">
        <button className="btn btn-primary" onClick={save} disabled={busy}>{busy ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save preferences</button>
        {msg && <span className="text-sm text-green">{msg}</span>}
      </div>
    </div>
  );
}

function Toggle({ label, hint, on, onChange }: { label: string; hint?: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div><div className="text-sm font-medium">{label}</div>{hint && <div className="text-[11px] text-txt-faint">{hint}</div>}</div>
      <button onClick={() => onChange(!on)} className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${on ? "bg-gold" : "bg-panel-2"}`}>
        <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-txt transition-transform ${on ? "translate-x-[22px]" : "translate-x-0.5"}`} />
      </button>
    </div>
  );
}

function TargetsTab({ users, targets, month, onSaved }: { users: { id: string; name: string; color: string }[]; targets: { userId: string; value: number }[]; month: string; onSaved: () => void }) {
  const initial: Record<string, number> = {};
  users.forEach((u) => (initial[u.id] = targets.find((t) => t.userId === u.id)?.value ?? 0));
  const [vals, setVals] = useState(initial);
  const [savingId, setSavingId] = useState("");

  async function save(userId: string) {
    setSavingId(userId);
    await fetch("/api/targets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, month, targetValue: vals[userId] }) });
    setSavingId("");
    onSaved();
  }

  const total = Object.values(vals).reduce((s, v) => s + (v || 0), 0);

  return (
    <Card className="p-5 max-w-3xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-bold">Monthly Sales Targets · {month}</h3>
        <Badge tone="gold">Team total {inr(total)}</Badge>
      </div>
      <div className="space-y-3">
        {users.map((u) => (
          <div key={u.id} className="flex items-center gap-3">
            <span className="grid place-items-center w-8 h-8 rounded-full text-[11px] font-bold text-[#1a1205]" style={{ background: u.color }}>{u.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}</span>
            <span className="text-sm font-medium flex-1">{u.name}</span>
            <div className="flex items-center gap-2">
              <span className="text-txt-faint text-sm">₹</span>
              <input className="input w-40" type="number" value={vals[u.id] || ""} onChange={(e) => setVals((s) => ({ ...s, [u.id]: Number(e.target.value) }))} placeholder="0" />
              <span className="text-xs text-txt-faint w-16">{inr(vals[u.id] || 0)}</span>
              <button className="btn btn-ghost text-sm" onClick={() => save(u.id)} disabled={savingId === u.id}>{savingId === u.id ? <Loader2 size={14} className="animate-spin" /> : "Set"}</button>
            </div>
          </div>
        ))}
        {users.length === 0 && <p className="text-sm text-txt-dim">No staff users yet.</p>}
      </div>
    </Card>
  );
}
