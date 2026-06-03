"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, Badge } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { inr } from "@/lib/format";
import { Plus, X, Loader2, Power, LogIn } from "lucide-react";

interface T {
  id: string;
  name: string;
  subdomain: string;
  plan: string;
  isActive: boolean;
  brandPrimary: string;
  users: number;
  leads: number;
  bookings: number;
  revenue: number;
}

const STEPS = ["Company", "Branding", "Plan & Modules", "Review"];

export function SuperAdminClient({ tenants, planPrice }: { tenants: T[]; planPrice: Record<string, number> }) {
  const router = useRouter();
  const [wizard, setWizard] = useState(false);
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    name: "",
    subdomain: "",
    reraNo: "",
    address: "",
    brandPrimary: "#d9a441",
    plan: "GROWTH",
    adminName: "",
    adminEmail: "",
  });

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function toggleActive(id: string, isActive: boolean) {
    const res = await fetch("/api/tenants", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, isActive: !isActive }),
    });
    if (res.ok) router.refresh();
  }

  async function createTenant() {
    setBusy(true);
    const res = await fetch("/api/tenants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setBusy(false);
    if (res.ok) {
      setWizard(false);
      setStep(0);
      setForm({ name: "", subdomain: "", reraNo: "", address: "", brandPrimary: "#d9a441", plan: "GROWTH", adminName: "", adminEmail: "" });
      router.refresh();
    } else {
      const j = await res.json().catch(() => ({}));
      alert(j.error || "Failed to create client");
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-bold text-lg">Client Tenants</h3>
        <button className="btn btn-primary" onClick={() => setWizard(true)}>
          <Plus size={16} /> Onboard Client
        </button>
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {tenants.map((t) => (
          <Card key={t.id} className="p-5">
            <div className="flex items-start gap-3 mb-4">
              <div className="grid place-items-center w-10 h-10 rounded-xl font-display font-bold text-[#1a1205]" style={{ background: t.brandPrimary }}>
                {t.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-display font-bold truncate">{t.name}</div>
                <div className="text-xs text-txt-faint">{t.subdomain}.realestate-os.app</div>
              </div>
              <Badge tone={t.isActive ? "green" : "red"}>{t.isActive ? "Active" : "Suspended"}</Badge>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-4 text-center">
              <div className="bg-bg-2 rounded-lg py-2"><div className="font-display font-bold">{t.users}</div><div className="text-[10px] text-txt-faint">Users</div></div>
              <div className="bg-bg-2 rounded-lg py-2"><div className="font-display font-bold">{t.leads}</div><div className="text-[10px] text-txt-faint">Leads</div></div>
              <div className="bg-bg-2 rounded-lg py-2"><div className="font-display font-bold">{t.bookings}</div><div className="text-[10px] text-txt-faint">Bookings</div></div>
            </div>
            <div className="flex items-center justify-between text-sm mb-3">
              <Badge tone="gold">{t.plan}</Badge>
              <span className="text-txt-dim">{inr(planPrice[t.plan] ?? 0)}/mo</span>
            </div>
            <div className="flex gap-2">
              <button className="btn btn-ghost flex-1 justify-center text-xs" onClick={() => toggleActive(t.id, t.isActive)}>
                <Power size={13} /> {t.isActive ? "Suspend" : "Activate"}
              </button>
              <button
                className="btn btn-ghost flex-1 justify-center text-xs"
                title="Impersonate (coming soon)"
                onClick={() => alert(`Impersonation for "${t.name}" is reserved for Creative Sharks support staff and requires 2FA confirmation.`)}
              >
                <LogIn size={13} /> Impersonate
              </button>
            </div>
          </Card>
        ))}
      </div>

      {/* Onboarding wizard */}
      {wizard && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <Card className="w-full max-w-lg p-6 animate-fade-in">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display font-bold text-lg">Onboard New Client</h3>
              <button onClick={() => setWizard(false)} className="text-txt-faint hover:text-txt"><X size={20} /></button>
            </div>

            {/* Stepper */}
            <div className="flex items-center gap-1 mb-6">
              {STEPS.map((s, i) => (
                <div key={s} className="flex-1">
                  <div className={`h-1.5 rounded-full ${i <= step ? "bg-gold" : "bg-bg-2"}`} />
                  <div className={`text-[10px] mt-1.5 ${i === step ? "text-gold-bright font-semibold" : "text-txt-faint"}`}>{s}</div>
                </div>
              ))}
            </div>

            {step === 0 && (
              <div className="space-y-3">
                <div><label className="field-label">Company name</label><input className="input" value={form.name} onChange={(e) => { set("name", e.target.value); set("subdomain", e.target.value.toLowerCase().replace(/[^a-z0-9]/g, "")); }} placeholder="Skyline Estates" /></div>
                <div><label className="field-label">Subdomain</label><div className="flex items-center gap-2"><input className="input" value={form.subdomain} onChange={(e) => set("subdomain", e.target.value)} /><span className="text-txt-faint text-sm">.realestate-os.app</span></div></div>
                <div><label className="field-label">RERA number (optional)</label><input className="input" value={form.reraNo} onChange={(e) => set("reraNo", e.target.value)} placeholder="RAJ/P/2024/…" /></div>
                <div><label className="field-label">Office address</label><input className="input" value={form.address} onChange={(e) => set("address", e.target.value)} /></div>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <label className="field-label">Brand accent colour</label>
                  <div className="flex items-center gap-3">
                    <input type="color" value={form.brandPrimary} onChange={(e) => set("brandPrimary", e.target.value)} className="w-12 h-10 rounded-lg bg-transparent border border-line cursor-pointer" />
                    <input className="input" value={form.brandPrimary} onChange={(e) => set("brandPrimary", e.target.value)} />
                  </div>
                </div>
                <div className="card p-4 flex items-center gap-3">
                  <div className="grid place-items-center w-10 h-10 rounded-xl font-display font-bold text-[#1a1205]" style={{ background: form.brandPrimary }}>{(form.name || "C").charAt(0)}</div>
                  <div><div className="font-display font-bold text-sm">{form.name || "Company"}</div><div className="text-xs text-txt-faint">Live brand preview</div></div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-3">
                <label className="field-label">Subscription plan</label>
                <div className="grid grid-cols-3 gap-2">
                  {["STARTER", "GROWTH", "ENTERPRISE"].map((p) => (
                    <button key={p} onClick={() => set("plan", p)} className={`card p-3 text-center ${form.plan === p ? "border-gold" : ""}`}>
                      <div className="font-display font-bold text-sm">{p}</div>
                      <div className="text-xs text-gold-bright mt-1">{inr(planPrice[p])}/mo</div>
                    </button>
                  ))}
                </div>
                <div className="pt-2"><label className="field-label">Owner / Admin name</label><input className="input" value={form.adminName} onChange={(e) => set("adminName", e.target.value)} placeholder="Owner full name" /></div>
                <div><label className="field-label">Admin login email</label><input className="input" type="email" value={form.adminEmail} onChange={(e) => set("adminEmail", e.target.value)} placeholder="owner@company.com" /></div>
                <p className="text-[11px] text-txt-faint">Admin gets a temporary password <span className="text-gold-bright">password123</span> and all modules enabled by default.</p>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-2 text-sm">
                {[["Company", form.name], ["Subdomain", `${form.subdomain}.realestate-os.app`], ["Plan", `${form.plan} · ${inr(planPrice[form.plan])}/mo`], ["Admin", `${form.adminName || "—"} (${form.adminEmail || "—"})`], ["RERA", form.reraNo || "—"]].map(([k, v]) => (
                  <div key={k} className="flex justify-between border-b border-line-soft py-2"><span className="text-txt-dim">{k}</span><span className="font-medium text-right">{v}</span></div>
                ))}
              </div>
            )}

            <div className="flex gap-2 mt-6">
              {step > 0 && <button className="btn btn-ghost" onClick={() => setStep((s) => s - 1)}>Back</button>}
              {step < STEPS.length - 1 ? (
                <button className="btn btn-primary ml-auto" disabled={step === 0 && (!form.name || !form.subdomain)} onClick={() => setStep((s) => s + 1)}>Next</button>
              ) : (
                <button className="btn btn-primary ml-auto" disabled={busy || !form.adminEmail} onClick={createTenant}>
                  {busy ? <Loader2 size={16} className="animate-spin" /> : <><Icon name="Rocket" size={15} /> Create Client</>}
                </button>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
