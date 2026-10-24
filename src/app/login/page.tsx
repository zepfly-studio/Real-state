"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

const DEMO = [
  { role: "Admin", email: "vinit@demo.com", color: "#d9a441" },
  { role: "Super Admin", email: "super@creativesharks.com", color: "#9b7ef0" },
  { role: "Manager", email: "rohit@demo.com", color: "#5b8def" },
  { role: "Employee", email: "priya@demo.com", color: "#3ec78d" },
  { role: "Client", email: "amit@demo.com", color: "#f0c14b" },
  { role: "Channel Partner", email: "sneha@demo.com", color: "#f0556a" },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("vinit@demo.com");
  const [password, setPassword] = useState("password123");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (res?.error) {
      setError("Invalid credentials. Use a demo account below (password: password123).");
    } else {
      // Lead Generation is the home screen; roles without it are sent on to /dashboard by its layout.
      router.push("/leadgen/overview");
      router.refresh();
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left brand panel */}
      <div className="hidden lg:flex flex-col justify-between p-12 border-r border-line relative overflow-hidden">
        <div className="flex items-center gap-3">
          <div className="grid place-items-center w-11 h-11 rounded-xl font-display font-extrabold text-[#1a1205] text-xl bg-gradient-to-b from-gold-bright to-gold">
            R
          </div>
          <div>
            <div className="font-display font-bold text-lg">Real Estate OS</div>
            <div className="text-xs text-txt-faint">Creative Sharks</div>
          </div>
        </div>
        <div className="max-w-md">
          <h2 className="font-display text-4xl font-bold leading-tight mb-4">
            The operating system for{" "}
            <span className="text-gold-bright">modern real estate</span> businesses.
          </h2>
          <p className="text-txt-dim">
            CRM, bookings, HR, compliance and 20+ AI tools — fully white-label, built
            for the Indian market.
          </p>
        </div>
        <div className="text-xs text-txt-faint">
          © {new Date().getFullYear()} Creative Sharks. All rights reserved.
        </div>
      </div>

      {/* Right form */}
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="grid place-items-center w-10 h-10 rounded-xl font-display font-extrabold text-[#1a1205] bg-gradient-to-b from-gold-bright to-gold">
              R
            </div>
            <div className="font-display font-bold">Real Estate OS</div>
          </div>

          <h1 className="font-display text-2xl font-bold mb-1">Welcome back</h1>
          <p className="text-txt-dim text-sm mb-6">Sign in to your workspace.</p>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="field-label">Email</label>
              <input
                className="input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="field-label">Password</label>
              <input
                className="input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && <div className="text-xs text-red">{error}</div>}
            <button className="btn btn-primary w-full justify-center" disabled={loading}>
              {loading ? <Loader2 size={16} className="animate-spin" /> : "Sign in"}
            </button>
          </form>

          <div className="mt-7">
            <div className="section-label mb-2">Demo accounts · password123</div>
            <div className="grid grid-cols-2 gap-2">
              {DEMO.map((d) => (
                <button
                  key={d.email}
                  onClick={() => {
                    setEmail(d.email);
                    setPassword("password123");
                  }}
                  className="flex items-center gap-2 px-2.5 py-2 rounded-lg border border-line hover:border-gold text-left transition-colors"
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ background: d.color }}
                  />
                  <span className="text-[11.5px] leading-tight">
                    <span className="font-semibold block">{d.role}</span>
                    <span className="text-txt-faint">{d.email}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
