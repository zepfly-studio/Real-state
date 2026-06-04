import Link from "next/link";
import { currentUser } from "@/lib/session";
import { Icon } from "@/components/Icon";

const FEATURES = [
  { icon: "Users", title: "Sales & Support CRM", body: "Capture every enquiry, track it through a drag-and-drop pipeline, and never lose a follow-up again." },
  { icon: "Wallet", title: "Bookings & Payments", body: "Manage inventory, generate booking receipts, payment schedules and EMI plans in a few clicks." },
  { icon: "BriefcaseBusiness", title: "Team & HR", body: "Attendance, leaves, salary slips, offer letters and documents — your whole team in one place." },
  { icon: "ShieldCheck", title: "RERA Compliance", body: "Track project registrations, document checklists and statutory deadlines so you never miss a date." },
  { icon: "Handshake", title: "Channel Partners", body: "Onboard brokers, track their deals and settle commissions with a transparent ledger and leaderboard." },
  { icon: "Palette", title: "Your Brand, Your App", body: "Your logo, colours and domain across the entire platform — give clients a premium branded experience." },
];

const STEPS = [
  { n: "1", icon: "Inbox", title: "Capture every lead", body: "Enquiries from walk-ins, portals, ads and referrals land in one organised inbox — auto-assigned to your team." },
  { n: "2", icon: "Workflow", title: "Manage the journey", body: "Move leads through site visits, negotiation and booking. Log calls, set follow-ups and send updates from one screen." },
  { n: "3", icon: "TrendingUp", title: "Close & grow", body: "Convert to bookings, collect payments, track revenue and team targets — with a live dashboard of your business." },
];

const TOOLS = [
  "AI Assistant", "WhatsApp Outreach", "Social Scheduler", "Smart Digest", "SEO Toolkit",
  "Creatives Generator", "Workflow Automation", "Sales Calling", "Visitor QR Passes",
  "Competitor Tracker", "Price Trends", "Link-in-bio Builder", "File Converter", "PDF Signature",
];

export default async function LandingPage() {
  const user = await currentUser();
  const cta = user ? { href: "/dashboard", label: "Go to Dashboard" } : { href: "/login", label: "Get Started" };

  return (
    <div style={{ background: "#ffffff", color: "#0a0e14", minHeight: "100vh" }} className="font-body">
      <div style={{ background: "radial-gradient(1100px 480px at 80% -120px, rgba(217,164,65,.16), transparent 60%), radial-gradient(800px 400px at 0% -100px, rgba(91,141,239,.12), transparent 55%)" }}>
        {/* Nav */}
        <header className="max-w-6xl mx-auto flex items-center gap-4 px-6 h-20">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="grid place-items-center w-9 h-9 rounded-[10px] font-display font-extrabold text-[#1a1205] bg-gradient-to-b from-[#f0c14b] to-[#d9a441]">R</span>
            <span className="font-display font-bold text-[17px]">Real Estate OS</span>
          </Link>
          <nav className="hidden md:flex items-center gap-7 ml-8 text-sm text-[#1f2733] font-medium">
            <a href="#features" className="hover:text-[#0a0e14]">Features</a>
            <a href="#how" className="hover:text-[#0a0e14]">How it works</a>
            <a href="#tools" className="hover:text-[#0a0e14]">Tools</a>
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <Link href="/login" className="text-sm font-semibold text-[#0a0e14] hidden sm:block">Sign in</Link>
            <Link href={cta.href} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg font-semibold text-sm text-[#1a1205] bg-gradient-to-b from-[#f0c14b] to-[#d9a441] shadow-sm hover:brightness-105">
              {cta.label} <Icon name="ArrowRight" size={15} />
            </Link>
          </div>
        </header>

        {/* Hero */}
        <section className="max-w-6xl mx-auto px-6 pt-12 pb-20 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#fbf3e0] text-[#8a5e10] text-xs font-semibold mb-6 border border-[#f0e2c0]">
            <Icon name="Building2" size={13} /> Built for India's real estate developers, brokers & agencies
          </div>
          <h1 className="font-display font-extrabold text-4xl sm:text-6xl leading-[1.05] tracking-tight max-w-4xl mx-auto text-[#0a0e14]">
            Run your entire real estate business from <span className="text-[#a8761b]">one dashboard</span>
          </h1>
          <p className="text-lg text-[#1f2733] mt-6 max-w-2xl mx-auto">
            Real Estate OS brings your leads, site visits, bookings, payments, team and compliance together —
            so you spend less time juggling tools and more time closing deals.
          </p>
          <div className="flex items-center justify-center gap-3 mt-9">
            <Link href={cta.href} className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-[#1a1205] bg-gradient-to-b from-[#f0c14b] to-[#d9a441] shadow-md hover:brightness-105">
              {cta.label} <Icon name="ArrowRight" size={17} />
            </Link>
            <a href="#how" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold border border-[#d7deea] text-[#0a0e14] hover:border-[#d9a441] transition-colors">
              See how it works
            </a>
          </div>

          {/* App mockup */}
          <div className="mt-16 max-w-5xl mx-auto rounded-2xl border border-[#e2e7f0] shadow-2xl overflow-hidden bg-[#0b0e14]">
            <div className="flex items-center gap-1.5 px-4 h-10 bg-[#0f131c] border-b border-[#222b3c]">
              <span className="w-3 h-3 rounded-full bg-[#f0556a]" /><span className="w-3 h-3 rounded-full bg-[#f0c14b]" /><span className="w-3 h-3 rounded-full bg-[#3ec78d]" />
              <span className="ml-3 text-[11px] text-[#8a96ad]">your-company.realestate-os.app/dashboard</span>
            </div>
            <div className="grid grid-cols-4 gap-3 p-5 text-left">
              {[["Total Revenue", "₹8.4Cr", "#d9a441"], ["Active Leads", "37", "#5b8def"], ["Bookings (MTD)", "8", "#3ec78d"], ["Conversion", "15.4%", "#9b7ef0"]].map(([l, v, c]) => (
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

      {/* How it works */}
      <section id="how" className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-[#0a0e14]">From enquiry to closing — without the chaos</h2>
          <p className="text-[#1f2733] mt-3 max-w-2xl mx-auto">Three simple steps replace your spreadsheets, WhatsApp groups and scattered tools.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          {STEPS.map((s) => (
            <div key={s.n} className="rounded-2xl border border-[#e9edf4] p-6 bg-white relative">
              <div className="flex items-center gap-3 mb-4">
                <span className="grid place-items-center w-9 h-9 rounded-full bg-[#0a0e14] text-white font-display font-bold text-sm">{s.n}</span>
                <span className="grid place-items-center w-10 h-10 rounded-xl bg-[#fbf3e0] text-[#a8761b]"><Icon name={s.icon} size={19} /></span>
              </div>
              <h3 className="font-display font-bold text-lg text-[#0a0e14]">{s.title}</h3>
              <p className="text-[#1f2733] text-sm mt-2 leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="bg-[#f7f9fc] border-y border-[#e9edf4]">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <div className="text-center mb-12">
            <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-[#0a0e14]">Everything your brokerage needs</h2>
            <p className="text-[#1f2733] mt-3 max-w-2xl mx-auto">One login for your whole team — sales, finance, HR, compliance and marketing.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-2xl border border-[#e9edf4] p-6 bg-white hover:shadow-lg transition-shadow">
                <div className="grid place-items-center w-11 h-11 rounded-xl bg-[#fbf3e0] text-[#a8761b] mb-4"><Icon name={f.icon} size={20} /></div>
                <h3 className="font-display font-bold text-lg text-[#0a0e14]">{f.title}</h3>
                <p className="text-[#1f2733] text-sm mt-2 leading-relaxed">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tools strip */}
      <section id="tools" className="max-w-6xl mx-auto px-6 py-20 text-center">
        <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-[#0a0e14]">Plus a full toolkit to grow faster</h2>
        <p className="text-[#1f2733] mt-3 mb-10 max-w-2xl mx-auto">Marketing, automation and productivity tools built right in — no extra subscriptions to manage.</p>
        <div className="flex flex-wrap justify-center gap-2.5">
          {TOOLS.map((t) => (
            <span key={t} className="px-4 py-2 rounded-full bg-white border border-[#d7deea] text-sm font-medium text-[#0a0e14]">{t}</span>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-6 pb-24">
        <div className="rounded-3xl px-8 py-14 text-center bg-gradient-to-br from-[#1b2433] to-[#0b0e14] text-white">
          <h2 className="font-display font-extrabold text-3xl sm:text-4xl">Ready to organise your real estate business?</h2>
          <p className="text-white/80 mt-3 max-w-xl mx-auto">Sign in and explore the full platform with sample data in under a minute.</p>
          <Link href={cta.href} className="inline-flex items-center gap-2 mt-8 px-6 py-3 rounded-xl font-bold text-[#1a1205] bg-gradient-to-b from-[#f0c14b] to-[#d9a441] hover:brightness-105">
            {cta.label} <Icon name="ArrowRight" size={17} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#e9edf4]">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center gap-3 text-sm text-[#46505f]">
          <div className="flex items-center gap-2">
            <span className="grid place-items-center w-7 h-7 rounded-lg font-display font-extrabold text-[#1a1205] bg-gradient-to-b from-[#f0c14b] to-[#d9a441] text-xs">R</span>
            <span className="font-display font-bold text-[#0a0e14]">Real Estate OS</span>
          </div>
          <span className="sm:ml-auto">© 2026 Creative Sharks. All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
}
