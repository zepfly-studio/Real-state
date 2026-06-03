"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader, Card, Badge } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { inr } from "@/lib/format";
import { Loader2, Save, Check } from "lucide-react";

interface ModuleState {
  key: string;
  label: string;
  group: string;
  icon: string;
  enabled: boolean;
  alwaysOn: boolean;
}
interface Props {
  tenant: Record<string, any>;
  modules: ModuleState[];
  groups: readonly string[];
  isSuperAdmin: boolean;
}

const PLANS = [
  { key: "STARTER", price: 4999, limits: { users: 10, leads: 2000, storageGb: 5 } },
  { key: "GROWTH", price: 14999, limits: { users: 40, leads: 15000, storageGb: 20 } },
  { key: "ENTERPRISE", price: 49999, limits: { users: 100, leads: 50000, storageGb: 50 } },
];

export function WhiteLabelClient({ tenant, modules, groups, isSuperAdmin }: Props) {
  const router = useRouter();
  const [f, setF] = useState(tenant);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [mods, setMods] = useState(modules);
  const set = (k: string, v: string) => setF((s: any) => ({ ...s, [k]: v }));

  async function saveBranding() {
    setBusy(true);
    setMsg("");
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenant: { name: f.name, logoUrl: f.logoUrl, faviconUrl: f.faviconUrl, brandPrimary: f.brandPrimary, brandAccent: f.brandAccent, domain: f.domain, reraNo: f.reraNo, gstNo: f.gstNo, address: f.address } }),
    });
    setBusy(false);
    if (res.ok) { setMsg("Brand applied across the tenant."); document.documentElement.style.setProperty("--gold", f.brandPrimary); router.refresh(); }
    else setMsg("Failed to save.");
  }

  async function toggleModule(key: string, enabled: boolean) {
    setMods((m) => m.map((x) => (x.key === key ? { ...x, enabled } : x)));
    await fetch("/api/white-label", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ moduleKey: key, enabled }) });
    router.refresh();
  }

  async function changePlan(plan: string) {
    const p = PLANS.find((x) => x.key === plan)!;
    setF((s: any) => ({ ...s, plan, featureLimits: p.limits }));
    await fetch("/api/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan, featureLimits: p.limits }) });
    router.refresh();
  }

  return (
    <div>
      <PageHeader title="White-Label Studio" subtitle="Re-skin the platform, toggle modules and manage the plan — no code required." icon="Palette" />

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          {/* Branding */}
          <Card className="p-5">
            <h3 className="font-display font-bold mb-4">Branding</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2"><label className="field-label">Company name</label><input className="input" value={f.name} onChange={(e) => set("name", e.target.value)} /></div>
              <div><label className="field-label">Logo URL</label><input className="input" value={f.logoUrl} onChange={(e) => set("logoUrl", e.target.value)} /></div>
              <div><label className="field-label">Favicon URL</label><input className="input" value={f.faviconUrl} onChange={(e) => set("faviconUrl", e.target.value)} /></div>
              <div><label className="field-label">Primary colour</label><div className="flex gap-2"><input type="color" value={f.brandPrimary} onChange={(e) => set("brandPrimary", e.target.value)} className="w-12 h-10 rounded-lg border border-line bg-transparent" /><input className="input" value={f.brandPrimary} onChange={(e) => set("brandPrimary", e.target.value)} /></div></div>
              <div><label className="field-label">Accent colour</label><div className="flex gap-2"><input type="color" value={f.brandAccent} onChange={(e) => set("brandAccent", e.target.value)} className="w-12 h-10 rounded-lg border border-line bg-transparent" /><input className="input" value={f.brandAccent} onChange={(e) => set("brandAccent", e.target.value)} /></div></div>
              <div><label className="field-label">Custom domain</label><input className="input" value={f.domain} onChange={(e) => set("domain", e.target.value)} placeholder="app.company.com" /></div>
              <div><label className="field-label">Subdomain</label><input className="input opacity-70" value={f.subdomain} disabled /></div>
              <div><label className="field-label">RERA no.</label><input className="input" value={f.reraNo} onChange={(e) => set("reraNo", e.target.value)} /></div>
              <div><label className="field-label">GST no.</label><input className="input" value={f.gstNo} onChange={(e) => set("gstNo", e.target.value)} /></div>
              <div className="sm:col-span-2"><label className="field-label">Address</label><input className="input" value={f.address} onChange={(e) => set("address", e.target.value)} /></div>
            </div>
            <div className="flex items-center gap-3 mt-4">
              <button className="btn btn-primary" onClick={saveBranding} disabled={busy}>{busy ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Apply branding</button>
              {msg && <span className="text-sm text-green">{msg}</span>}
            </div>
          </Card>

          {/* Module toggles */}
          <Card className="p-5">
            <h3 className="font-display font-bold mb-1">Modules</h3>
            <p className="text-xs text-txt-dim mb-4">Turn modules on/off for this client. Disabled modules vanish from every user's sidebar and are route-guarded.</p>
            {groups.map((g) => (
              <div key={g} className="mb-4">
                <div className="section-label mb-2">{g}</div>
                <div className="grid sm:grid-cols-2 gap-2">
                  {mods.filter((m) => m.group === g).map((m) => (
                    <div key={m.key} className="flex items-center gap-2.5 p-2.5 rounded-lg bg-bg-2">
                      <span className="text-gold-bright"><Icon name={m.icon} size={15} /></span>
                      <span className="text-sm flex-1">{m.label}</span>
                      {m.alwaysOn ? (
                        <span className="text-[10px] text-txt-faint">Always on</span>
                      ) : (
                        <button onClick={() => toggleModule(m.key, !m.enabled)} className={`relative w-10 h-5.5 rounded-full transition-colors shrink-0 ${m.enabled ? "bg-gold" : "bg-panel-2"}`} style={{ height: 22 }}>
                          <span className={`absolute top-0.5 w-[18px] h-[18px] rounded-full bg-txt transition-transform ${m.enabled ? "translate-x-[20px]" : "translate-x-0.5"}`} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </Card>
        </div>

        {/* Right rail: preview + plan */}
        <div className="space-y-5">
          <Card className="p-5 sticky top-20">
            <div className="section-label mb-3">Brand preview</div>
            <div className="flex items-center gap-3 mb-4 p-3 rounded-xl bg-bg-2">
              <div className="grid place-items-center w-10 h-10 rounded-[10px] font-display font-extrabold text-[#1a1205]" style={{ background: `linear-gradient(180deg, ${f.brandAccent}, ${f.brandPrimary})` }}>{(f.name || "R").charAt(0)}</div>
              <div><div className="font-display font-bold text-sm">{f.name || "Company"}</div><div className="text-[11px] text-txt-faint">{f.subdomain}.realestate-os.app</div></div>
            </div>
            <button className="w-full rounded-lg py-2.5 font-semibold text-sm text-[#1a1205]" style={{ background: f.brandPrimary }}>Primary action</button>
          </Card>

          <Card className="p-5">
            <div className="section-label mb-3">Subscription & billing</div>
            <div className="space-y-2">
              {PLANS.map((p) => (
                <button key={p.key} onClick={() => changePlan(p.key)} disabled={!isSuperAdmin && p.key !== f.plan} className={`w-full text-left p-3 rounded-xl border transition-colors ${f.plan === p.key ? "border-gold bg-gold-soft" : "border-line hover:border-gold"} ${!isSuperAdmin && p.key !== f.plan ? "opacity-50 cursor-not-allowed" : ""}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-display font-bold text-sm">{p.key}</span>
                    {f.plan === p.key && <Check size={15} className="text-gold-bright" />}
                  </div>
                  <div className="text-xs text-gold-bright mt-0.5">{inr(p.price)}/mo</div>
                  <div className="text-[11px] text-txt-faint mt-1">{p.limits.users} users · {p.limits.leads.toLocaleString("en-IN")} leads · {p.limits.storageGb}GB</div>
                </button>
              ))}
            </div>
            {!isSuperAdmin && <p className="text-[11px] text-txt-faint mt-3">Contact Creative Sharks to change your plan.</p>}
          </Card>
        </div>
      </div>
    </div>
  );
}
