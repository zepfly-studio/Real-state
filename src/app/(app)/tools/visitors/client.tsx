"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, PageHeader, Badge, EmptyState, KPICard } from "@/components/ui";
import { Icon } from "@/components/Icon";

interface Visitor {
  id: string;
  name: string;
  phone: string;
  purpose: string;
  qrCode: string;
  checkIn: string;
  checkOut: string | null;
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function isToday(dateStr: string): boolean {
  const d = new Date(dateStr);
  const now = new Date();
  return (
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear()
  );
}

// ─── QR Code Image Component ──────────────────────────────────────

function QRCodeImage({ value, size = 80 }: { value: string; size?: number }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    import("qrcode")
      .then((QRCode) =>
        QRCode.toDataURL(value, {
          width: size,
          margin: 1,
          color: { dark: "#1a1a1a", light: "#ffffff" },
        })
      )
      .then((url) => {
        if (!cancelled) setDataUrl(url);
      })
      .catch(() => {/* silent */});
    return () => {
      cancelled = true;
    };
  }, [value, size]);

  if (!dataUrl) {
    return (
      <div
        className="skeleton rounded-lg"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <img
      src={dataUrl}
      alt={`QR: ${value}`}
      width={size}
      height={size}
      className="rounded-lg"
    />
  );
}

// ─── Check-In Form ────────────────────────────────────────────────

function CheckInForm({ onCheckedIn }: { onCheckedIn: (visitor: Visitor) => void }) {
  const [form, setForm] = useState({ name: "", phone: "", purpose: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<Visitor | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.phone || !form.purpose) {
      setError("All fields are required.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/visitors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Failed to check in.");
        return;
      }
      const visitor = await res.json();
      setSuccess(visitor);
      onCheckedIn(visitor);
      setForm({ name: "", phone: "", purpose: "" });
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-4">
        <Icon name="UserPlus" size={18} className="text-gold-bright" />
        <h3 className="font-display font-bold text-base">Check-In Visitor</h3>
      </div>
      <form onSubmit={submit} className="space-y-3">
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="field-label">Full Name</label>
            <input
              className="input w-full"
              placeholder="Visitor name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div>
            <label className="field-label">Phone</label>
            <input
              className="input w-full"
              placeholder="+91 98765 43210"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>
        </div>
        <div>
          <label className="field-label">Purpose of Visit</label>
          <input
            className="input w-full"
            placeholder="e.g. Site visit – Flat inquiry, Meeting with sales team"
            value={form.purpose}
            onChange={(e) => setForm({ ...form, purpose: e.target.value })}
          />
        </div>
        {error && <p className="text-red text-sm">{error}</p>}
        <button type="submit" disabled={loading} className="btn btn-primary w-full gap-2">
          <Icon name="LogIn" size={16} />
          {loading ? "Checking in…" : "Check In & Generate QR"}
        </button>
      </form>

      {/* Success state with QR */}
      {success && (
        <div className="mt-4 p-4 rounded-2xl bg-[rgba(62,199,141,.08)] border border-[rgba(62,199,141,.2)] flex items-center gap-4">
          <QRCodeImage value={success.qrCode} size={72} />
          <div>
            <p className="font-semibold text-green text-sm mb-0.5">
              Checked in successfully!
            </p>
            <p className="text-txt font-bold">{success.name}</p>
            <p className="text-xs text-txt-dim font-mono">{success.qrCode}</p>
            <p className="text-xs text-txt-faint mt-0.5">
              {formatTime(success.checkIn)}
            </p>
          </div>
        </div>
      )}
    </Card>
  );
}

// ─── Visitor Row ──────────────────────────────────────────────────

function VisitorRow({
  visitor,
  onCheckOut,
}: {
  visitor: Visitor;
  onCheckOut: (id: string) => void;
}) {
  const [loading, setLoading] = useState(false);

  async function checkOut() {
    setLoading(true);
    try {
      await fetch(`/api/visitors/${visitor.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checkOut: new Date().toISOString() }),
      });
      onCheckOut(visitor.id);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  return (
    <tr className="border-b border-line last:border-0 hover:bg-panel transition-colors">
      <td className="py-3 px-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gold-soft grid place-items-center text-gold-bright text-xs font-bold flex-shrink-0">
            {visitor.name
              .split(" ")
              .map((w) => w[0])
              .slice(0, 2)
              .join("")
              .toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-sm leading-tight">{visitor.name}</p>
            <p className="text-xs text-txt-dim">{visitor.phone}</p>
          </div>
        </div>
      </td>
      <td className="py-3 px-3 text-sm text-txt-dim">{visitor.purpose}</td>
      <td className="py-3 px-3 text-sm font-mono text-xs">
        {formatTime(visitor.checkIn)}
      </td>
      <td className="py-3 px-3">
        <QRCodeImage value={visitor.qrCode} size={40} />
      </td>
      <td className="py-3 px-3 text-sm">
        {visitor.checkOut ? (
          <Badge tone="green">{formatTime(visitor.checkOut)}</Badge>
        ) : (
          <button
            onClick={checkOut}
            disabled={loading}
            className="btn btn-ghost text-xs gap-1"
          >
            <Icon name="LogOut" size={13} />
            {loading ? "…" : "Check out"}
          </button>
        )}
      </td>
    </tr>
  );
}

// ─── Main Client Component ────────────────────────────────────────

export function VisitorClient({
  visitors: initialVisitors,
}: {
  visitors: Visitor[];
  tenantId: string;
}) {
  const router = useRouter();
  const [visitors, setVisitors] = useState(initialVisitors);

  const todayVisitors = visitors.filter((v) => isToday(v.checkIn));
  const checkedOut = todayVisitors.filter((v) => v.checkOut !== null).length;
  const inside = todayVisitors.length - checkedOut;
  const historyVisitors = visitors.filter((v) => !isToday(v.checkIn));

  const handleCheckedIn = useCallback(
    (visitor: Visitor) => {
      setVisitors((prev) => [visitor, ...prev]);
    },
    []
  );

  const handleCheckOut = useCallback((id: string) => {
    setVisitors((prev) =>
      prev.map((v) =>
        v.id === id ? { ...v, checkOut: new Date().toISOString() } : v
      )
    );
    router.refresh();
  }, [router]);

  return (
    <div>
      <PageHeader
        title="Visitor Log & Security"
        subtitle="Check-in visitors, generate QR passes, and manage site security."
        icon="QrCode"
      />

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <KPICard
          label="Inside Now"
          value={String(inside)}
          icon="UserCheck"
          accent="green"
        />
        <KPICard
          label="Checked Out"
          value={String(checkedOut)}
          icon="LogOut"
          accent="blue"
        />
        <KPICard
          label="Total Today"
          value={String(todayVisitors.length)}
          icon="Users"
          accent="gold"
        />
      </div>

      {/* Check-in form */}
      <div className="mb-6">
        <CheckInForm onCheckedIn={handleCheckedIn} />
      </div>

      {/* Today's visitors table */}
      <Card className="p-5 mb-6">
        <h3 className="font-display font-bold text-base mb-4 flex items-center gap-2">
          <Icon name="CalendarDays" size={16} className="text-gold-bright" />
          Today&apos;s Visitors
          <span className="tag bg-gold-soft text-gold-bright ml-1">
            {todayVisitors.length}
          </span>
        </h3>
        {todayVisitors.length === 0 ? (
          <EmptyState
            icon="Users"
            title="No visitors today yet"
            hint="Check in your first visitor using the form above."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line">
                  <th className="text-left py-2 px-3 text-txt-faint font-semibold text-xs uppercase tracking-wide">
                    Visitor
                  </th>
                  <th className="text-left py-2 px-3 text-txt-faint font-semibold text-xs uppercase tracking-wide">
                    Purpose
                  </th>
                  <th className="text-left py-2 px-3 text-txt-faint font-semibold text-xs uppercase tracking-wide">
                    Check-in
                  </th>
                  <th className="text-left py-2 px-3 text-txt-faint font-semibold text-xs uppercase tracking-wide">
                    QR
                  </th>
                  <th className="text-left py-2 px-3 text-txt-faint font-semibold text-xs uppercase tracking-wide">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {todayVisitors.map((v) => (
                  <VisitorRow key={v.id} visitor={v} onCheckOut={handleCheckOut} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* History */}
      {historyVisitors.length > 0 && (
        <Card className="p-5">
          <h3 className="font-display font-bold text-base mb-4 flex items-center gap-2">
            <Icon name="History" size={16} className="text-txt-dim" />
            Security Records
            <span className="tag bg-panel-2 text-txt-dim ml-1">
              {historyVisitors.length}
            </span>
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line">
                  <th className="text-left py-2 px-3 text-txt-faint font-semibold text-xs uppercase tracking-wide">
                    Visitor
                  </th>
                  <th className="text-left py-2 px-3 text-txt-faint font-semibold text-xs uppercase tracking-wide">
                    Purpose
                  </th>
                  <th className="text-left py-2 px-3 text-txt-faint font-semibold text-xs uppercase tracking-wide">
                    Date
                  </th>
                  <th className="text-left py-2 px-3 text-txt-faint font-semibold text-xs uppercase tracking-wide">
                    Check-in
                  </th>
                  <th className="text-left py-2 px-3 text-txt-faint font-semibold text-xs uppercase tracking-wide">
                    Check-out
                  </th>
                </tr>
              </thead>
              <tbody>
                {historyVisitors.slice(0, 50).map((v) => (
                  <tr
                    key={v.id}
                    className="border-b border-line last:border-0 hover:bg-panel transition-colors"
                  >
                    <td className="py-3 px-3">
                      <p className="font-semibold text-sm">{v.name}</p>
                      <p className="text-xs text-txt-dim">{v.phone}</p>
                    </td>
                    <td className="py-3 px-3 text-sm text-txt-dim">{v.purpose}</td>
                    <td className="py-3 px-3 text-xs text-txt-dim">
                      {new Date(v.checkIn).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="py-3 px-3 text-xs font-mono">
                      {formatTime(v.checkIn)}
                    </td>
                    <td className="py-3 px-3">
                      {v.checkOut ? (
                        <Badge tone="neutral">{formatTime(v.checkOut)}</Badge>
                      ) : (
                        <Badge tone="gold">Still inside</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
