import Link from "next/link";
import { currentUser } from "@/lib/session";
import { Icon } from "@/components/Icon";

const FEATURES = [
  { icon: "Users", title: "Sales & Support CRM", body: "Drag-and-drop pipeline, lead scoring, activity timelines, CSV import/export — close faster." },
  { icon: "Wallet", title: "Finance & Booking", body: "Bookings, EMI schedules, inventory, PDF receipts and GST / stamp-duty / EMI calculators." },
  { icon: "BriefcaseBusiness", title: "Employee & HR", body: "Attendance, leaves, salary slips, offer letters and a document vault — all in one place." },
  { icon: "ShieldCheck", title: "RERA Compliance", body: "Track registrations, expiry countdowns, document checklists and statutory deadlines." },
  { icon: "Sparkles", title: "AI Assistant", body: "Ask about your pipeline, hot leads and revenue in plain Hinglish — answered from live data." },
  { icon: "Palette", title: "Full White-Label", body: "Your logo, your colours, your domain. Re-skin the whole platform with zero code." },
];

const TOOLS = [
  "Lead Genius", "WhatsApp CRM", "Social Auto Post", "Smart Email Digest", "SEO Genius",
  "GMB Extractor", "Creatives Generator", "Workflow Triggers", "Sales Calling", "Channel Partners",
  "Visitor Log & QR", "Competitor Tracker", "Price Trends", "IVR Console", "Link Page Builder",
  "File Converter", "PDF Signature", "Company Policies",
];

const PLANS = [
  { name: "Starter", price: "₹4,999", per: "/mo", points: ["Up to 10 users", "2,000 leads", "Core CRM + HR", "Email support"], featured: false },
  { name: "Growth", price: "₹14,999", per: "/mo", points: ["Up to 40 users", "15,000 leads", "All AI & heavy tools", "Priority support"], featured: true },
  { name: "Enterprise", price: "₹49,999", per: "/mo", points: ["100 users", "50,000 leads", "White-label + custom domain", "Dedicated manager"], featured: false },
];

export default async function LandingPage() {
  const user = await currentUser();
  const cta = user ? { href: "/dashboard", label: "Go to Dashboard" } : { href: "/login", label: "Get Started" };

  return (
    <div style={{ background: "#ffffff", color: "#1b2433", minHeight: "100vh" }} className="font-body">
      {/* subtle top gradient */}
      <div style={{ background: "radial-gradient(1100px 480px at 80% -120px, rgba(217,164,65,.16), transparent 60%), radial-gradient(800px 400px at 0% -100px, rgba(91,141,239,.12), transparent 55%)" }}>
        {/* Nav */}
        <header className="max-w-6xl mx-auto flex items-center gap-4 px-6 h-20">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="grid place-items-center w-9 h-9 rounded-[10px] font-display font-extrabold text-[#1a1205] bg-gradient-to-b from-[#f0c14b] to-[#d9a441]">R</span>
            <span className="font-display font-bold text-[17px]">Real Estate OS</span>
          </Link>
          <nav className="hidden md:flex items-center gap-7 ml-8 text-sm text-[#5a6477] font-medium">
            <a href="#features" className="hover:text-[#1b2433]">Features</a>
            <a href="#tools" className="hover:text-[#1b2433]">Tools</a>
            <a href="#pricing" className="hover:text-[#1b2433]">Pricing</a>
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <Link href="/login" className="text-sm font-semibold text-[#1b2433] hidden sm:block">Sign in</Link>
            <Link href={cta.href} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg font-semibold text-sm text-[#1a1205] bg-gradient-to-b from-[#f0c14b] to-[#d9a441] shadow-sm hover:brightness-105">
              {cta.label} <Icon name="ArrowRight" size={15} />
            </Link>
          </div>
        </header>

        {/* Hero */}
        <section className="max-w-6xl mx-auto px-6 pt-12 pb-20 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#fbf3e0] text-[#9a6c12] text-xs font-semibold mb-6 border border-[#f0e2c0]">
            <Icon name="Sparkles" size={13} /> Built for the Indian real-estate market · Runs without any API keys
          </div>
          <h1 className="font-display font-extrabold text-4xl sm:text-6xl leading-[1.05] tracking-tight max-w-4xl mx-auto">
            The all-in-one <span className="text-[#c8902f]">operating system</span> for modern real estate
          </h1>
          <p className="text-lg text-[#5a6477] mt-6 max-w-2xl mx-auto">
            CRM, bookings, HR, RERA compliance and 20+ AI &amp; productivity tools — fully white-label,
            multi-tenant, and ready to run on day one.
          </p>
          <div className="flex items-center justify-center gap-3 mt-9">
            <Link href={cta.href} className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-[#1a1205] bg-gradient-to-b from-[#f0c14b] to-[#d9a441] shadow-md hover:brightness-105">
              {cta.label} <Icon name="ArrowRight" size={17} />
            </Link>
            <a href="#features" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold border border-[#e2e7f0] hover:border-[#d9a441] transition-colors">
              Explore features
            </a>
          </div>

          {/* App mockup */}
          <div className="mt-16 max-w-5xl mx-auto rounded-2xl border border-[#e2e7f0] shadow-2xl overflow-hidden bg-[#0b0e14]">
            <div className="flex items-center gap-1.5 px-4 h-10 bg-[#0f131c] border-b border-[#222b3c]">
              <span className="w-3 h-3 rounded-full bg-[#f0556a]" /><span className="w-3 h-3 rounded-full bg-[#f0c14b]" /><span className="w-3 h-3 rounded-full bg-[#3ec78d]" />
              <span className="ml-3 text-[11px] text-[#5a6477]">app.realestate-os.app/dashboard</span>
            </div>
            <div className="grid grid-cols-4 gap-3 p-5 text-left">
              {[["Total Revenue", "₹8.4Cr", "#d9a441"], ["Active Leads", "37", "#5b8def"], ["Bookings MTD", "8", "#3ec78d"], ["Conversion", "15.4%", "#9b7ef0"]].map(([l, v, c]) => (
                <div key={l} className="rounded-xl border border-[#222b3c] bg-[#141a26] p-4">
                  <div className="text-[11px] text-[#8a96ad] uppercase tracking-wide">{l}</div>
                  <div className="font-display font-bold text-xl text-[#e8edf6] mt-1.5">{v}</div>
                  <div className="h-1.5 rounded-full mt-3" style={{ background: c as string, opacity: 0.8 }} />
                </div>
              ))}
              <div className="col-span-4 rounded-xl border border-[#222b3c] bg-[#141a26] p-4 flex items-end gap-2 h-40">
                {[40, 65, 50, 80, 60, 95, 75].map((h, i) => (
                  <div key={i} className="flex-1 rounded-t-md bg-gradient-to-t from-[#d9a441]/40 to-[#f0c14b]" style={{ height: `${h}%` }} />
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Features */}
      <section id="features" className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="font-display font-extrabold text-3xl sm:text-4xl">Everything your brokerage needs</h2>
          <p className="text-[#5a6477] mt-3 max-w-2xl mx-auto">One login. Every team. Sales, finance, HR, compliance and marketing — unified.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-2xl border border-[#e9edf4] p-6 bg-white hover:shadow-lg transition-shadow">
              <div className="grid place-items-center w-11 h-11 rounded-xl bg-[#fbf3e0] text-[#c8902f] mb-4"><Icon name={f.icon} size={20} /></div>
              <h3 className="font-display font-bold text-lg">{f.title}</h3>
              <p className="text-[#5a6477] text-sm mt-2 leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Tools strip */}
      <section id="tools" className="bg-[#f7f9fc] border-y border-[#e9edf4]">
        <div className="max-w-6xl mx-auto px-6 py-20 text-center">
          <h2 className="font-display font-extrabold text-3xl sm:text-4xl">Plus 18 power tools, included</h2>
          <p className="text-[#5a6477] mt-3 mb-10 max-w-2xl mx-auto">Most work fully in-house — no third-party keys required to get started.</p>
          <div className="flex flex-wrap justify-center gap-2.5">
            {TOOLS.map((t) => (
              <span key={t} className="px-4 py-2 rounded-full bg-white border border-[#e2e7f0] text-sm font-medium text-[#3b4458]">{t}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="font-display font-extrabold text-3xl sm:text-4xl">Simple, transparent pricing</h2>
          <p className="text-[#5a6477] mt-3">Per-tenant plans. Cancel anytime.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-5 max-w-4xl mx-auto">
          {PLANS.map((p) => (
            <div key={p.name} className={`rounded-2xl p-7 border ${p.featured ? "border-[#d9a441] shadow-xl bg-white relative" : "border-[#e9edf4] bg-white"}`}>
              {p.featured && <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-gradient-to-b from-[#f0c14b] to-[#d9a441] text-[#1a1205] text-[11px] font-bold">MOST POPULAR</span>}
              <h3 className="font-display font-bold text-lg">{p.name}</h3>
              <div className="mt-3 mb-5"><span className="font-display font-extrabold text-4xl">{p.price}</span><span className="text-[#8a96ad] text-sm">{p.per}</span></div>
              <ul className="space-y-2.5 mb-7">
                {p.points.map((pt) => (
                  <li key={pt} className="flex items-center gap-2 text-sm text-[#3b4458]"><Icon name="Check" size={15} className="text-[#1f9d68]" /> {pt}</li>
                ))}
              </ul>
              <Link href="/login" className={`block text-center py-2.5 rounded-xl font-semibold text-sm ${p.featured ? "text-[#1a1205] bg-gradient-to-b from-[#f0c14b] to-[#d9a441]" : "border border-[#e2e7f0] hover:border-[#d9a441]"}`}>Start free</Link>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-6 pb-24">
        <div className="rounded-3xl px-8 py-14 text-center bg-gradient-to-br from-[#1b2433] to-[#0b0e14] text-white">
          <h2 className="font-display font-extrabold text-3xl sm:text-4xl">Ready to run your brokerage on autopilot?</h2>
          <p className="text-white/70 mt-3 max-w-xl mx-auto">Log in with a demo account and explore all 27 modules in under a minute.</p>
          <Link href={cta.href} className="inline-flex items-center gap-2 mt-8 px-6 py-3 rounded-xl font-bold text-[#1a1205] bg-gradient-to-b from-[#f0c14b] to-[#d9a441] hover:brightness-105">
            {cta.label} <Icon name="ArrowRight" size={17} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#e9edf4]">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center gap-3 text-sm text-[#8a96ad]">
          <div className="flex items-center gap-2">
            <span className="grid place-items-center w-7 h-7 rounded-lg font-display font-extrabold text-[#1a1205] bg-gradient-to-b from-[#f0c14b] to-[#d9a441] text-xs">R</span>
            <span className="font-display font-bold text-[#1b2433]">Real Estate OS</span>
          </div>
          <span className="sm:ml-auto">© {new Date().getFullYear()} Creative Sharks. All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
}
