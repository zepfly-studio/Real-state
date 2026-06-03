"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card, Badge, EmptyState } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { inr, inrFull } from "@/lib/format";
import { PaymentStatus, PropertyStatus, Role } from "@prisma/client";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ScheduleMilestone {
  milestone: string;
  pct: number;
  status: "paid" | "due" | string;
  dueDate?: string | null;
}

interface BookingProperty {
  id: string;
  name: string;
  projectName: string;
  unitType: string;
  sizeSqft: number;
  pricePerSqft: number;
  totalPrice: number;
  status: PropertyStatus;
  reraId?: string | null;
  location?: string | null;
  createdAt: string;
  tenantId: string;
}

interface BookingLead {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
}

interface Booking {
  id: string;
  tenantId: string;
  leadId: string;
  propertyId: string;
  amount: number;
  paymentStatus: PaymentStatus;
  schedule: ScheduleMilestone[];
  bookedById?: string | null;
  createdAt: string;
  lead: BookingLead;
  property: BookingProperty;
}

interface Property {
  id: string;
  tenantId: string;
  name: string;
  projectName: string;
  unitType: string;
  sizeSqft: number;
  pricePerSqft: number;
  totalPrice: number;
  status: PropertyStatus;
  reraId?: string | null;
  location?: string | null;
  createdAt: string;
}

interface LeadOption {
  id: string;
  name: string;
  phone: string;
}

interface Props {
  bookings: Booking[];
  properties: Property[];
  leads: LeadOption[];
  userRole: Role;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function paymentBadge(status: PaymentStatus) {
  if (status === "FULL_PAID") return <Badge tone="green">Full Paid</Badge>;
  if (status === "PAID_20") return <Badge tone="gold">Paid 20%</Badge>;
  return <Badge tone="blue">Token</Badge>;
}

function statusBadge(status: PropertyStatus) {
  if (status === "AVAILABLE") return <Badge tone="green">Available</Badge>;
  if (status === "HELD") return <Badge tone="gold">Held</Badge>;
  return <Badge tone="red">Sold</Badge>;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

// Standard EMI formula
function calcEMI(principal: number, annualRate: number, tenureYears: number) {
  if (!principal || !annualRate || !tenureYears) return { emi: 0, total: 0, interest: 0 };
  const r = annualRate / 100 / 12;
  const n = tenureYears * 12;
  if (r === 0) return { emi: principal / n, total: principal, interest: 0 };
  const emi = (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  const total = emi * n;
  return { emi, total, interest: total - principal };
}

// Amortization table (first 12 rows + last)
function amortization(principal: number, annualRate: number, tenureYears: number) {
  const r = annualRate / 100 / 12;
  const n = tenureYears * 12;
  const { emi } = calcEMI(principal, annualRate, tenureYears);
  const rows: { month: number; emi: number; interest: number; principal: number; balance: number }[] = [];
  let balance = principal;
  for (let i = 1; i <= Math.min(n, 13); i++) {
    const interest = balance * r;
    const princ = emi - interest;
    balance = Math.max(0, balance - princ);
    rows.push({ month: i, emi, interest, principal: princ, balance });
  }
  return rows;
}

// ─── PDF Receipt ──────────────────────────────────────────────────────────────

async function downloadReceipt(booking: Booking) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const gold = [217, 164, 65] as [number, number, number];
  const dark = [20, 26, 38] as [number, number, number];
  const mid = [90, 100, 119] as [number, number, number];

  // Header bar
  doc.setFillColor(...gold);
  doc.rect(0, 0, 210, 28, "F");

  doc.setTextColor(20, 13, 0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("Shubh Realtors", 14, 16);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("BOOKING RECEIPT", 160, 10);
  doc.setFontSize(8);
  doc.text(`Receipt #: BKG-${booking.id.slice(-6).toUpperCase()}`, 160, 16);
  doc.text(`Date: ${formatDate(booking.createdAt)}`, 160, 21);

  // Sub-header
  doc.setFillColor(...dark);
  doc.rect(0, 28, 210, 8, "F");
  doc.setTextColor(240, 193, 75);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("Mansarovar, Jaipur · RERA Registered Developer · GST No: 08ABCDE1234F1Z5", 14, 33.5);

  // Body
  doc.setTextColor(...dark);
  let y = 50;

  const line = (label: string, value: string, bold = false) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(10);
    doc.setTextColor(...mid);
    doc.text(label, 14, y);
    doc.setTextColor(...dark);
    doc.text(value, 80, y);
    y += 8;
  };

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...dark);
  doc.text("Client Details", 14, y);
  y += 6;
  doc.setDrawColor(230, 230, 230);
  doc.line(14, y, 196, y);
  y += 6;

  line("Client Name", booking.lead.name);
  line("Contact", booking.lead.phone);
  if (booking.lead.email) line("Email", booking.lead.email);

  y += 4;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Property Details", 14, y);
  y += 6;
  doc.line(14, y, 196, y);
  y += 6;

  line("Project", booking.property.projectName);
  line("Unit", booking.property.name);
  line("Unit Type", booking.property.unitType);
  line("Size", `${booking.property.sizeSqft.toLocaleString("en-IN")} sq.ft`);
  if (booking.property.location) line("Location", booking.property.location);
  if (booking.property.reraId) line("RERA ID", booking.property.reraId);

  y += 4;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Payment Details", 14, y);
  y += 6;
  doc.line(14, y, 196, y);
  y += 6;

  line("Amount Paid", inrFull(booking.amount), true);
  line("Payment Status", booking.paymentStatus.replace("_", " "));
  line("Booking Date", formatDate(booking.createdAt));

  // Amount box
  y += 4;
  doc.setFillColor(245, 240, 220);
  doc.roundedRect(14, y, 182, 16, 3, 3, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...dark);
  doc.text("Total Amount:", 20, y + 10.5);
  doc.setTextColor(180, 120, 20);
  doc.text(inrFull(booking.amount), 120, y + 10.5);
  y += 24;

  // Footer
  doc.setFillColor(...dark);
  doc.rect(0, 270, 210, 27, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(160, 160, 160);
  doc.text("This is a system-generated receipt. For queries: info@shubhrealtors.com | +91 98765 43210", 14, 282);
  doc.text("Shubh Realtors · 12, Jawahar Nagar, C-Scheme, Jaipur 302001 · www.shubhrealtors.com", 14, 288);

  doc.save(`Receipt-${booking.lead.name.replace(/\s+/g, "_")}-${booking.id.slice(-6)}.pdf`);
}

// ─── Tab: Booking Register ────────────────────────────────────────────────────

function BookingRegister({
  bookings,
  properties,
  leads,
}: {
  bookings: Booking[];
  properties: Property[];
  leads: LeadOption[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Booking | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    propertyId: "",
    leadId: "",
    amount: "",
    paymentStatus: "TOKEN" as PaymentStatus,
  });

  const availableProperties = properties.filter((p) => p.status === "AVAILABLE");

  function set<K extends keyof typeof form>(k: K, v: any) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  // Auto-fill amount from property total price
  function onPropertyChange(propId: string) {
    set("propertyId", propId);
    const prop = availableProperties.find((p) => p.id === propId);
    if (prop) set("amount", String(prop.totalPrice));
  }

  async function createBooking() {
    if (!form.propertyId || !form.leadId || !form.amount) return;
    setBusy(true);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setShowNew(false);
        setForm({ propertyId: "", leadId: "", amount: "", paymentStatus: "TOKEN" });
        router.refresh();
      } else {
        const j = await res.json().catch(() => ({}));
        alert(j.error || "Failed to create booking");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-txt-dim text-sm">{bookings.length} bookings in register</p>
        <button className="btn btn-primary" onClick={() => setShowNew(true)}>
          <Icon name="Plus" size={15} /> New Booking
        </button>
      </div>

      {bookings.length === 0 ? (
        <EmptyState
          icon="FileCheck2"
          title="No bookings yet"
          hint="Create your first booking using the button above."
          action={
            <button className="btn btn-primary" onClick={() => setShowNew(true)}>
              <Icon name="Plus" size={15} /> New Booking
            </button>
          }
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line">
                  <th className="text-left p-3 text-txt-faint font-semibold text-[11px] uppercase tracking-wide">Client</th>
                  <th className="text-left p-3 text-txt-faint font-semibold text-[11px] uppercase tracking-wide">Project / Unit</th>
                  <th className="text-left p-3 text-txt-faint font-semibold text-[11px] uppercase tracking-wide">Amount</th>
                  <th className="text-left p-3 text-txt-faint font-semibold text-[11px] uppercase tracking-wide">Status</th>
                  <th className="text-left p-3 text-txt-faint font-semibold text-[11px] uppercase tracking-wide">Date</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => (
                  <tr
                    key={b.id}
                    className="border-b border-line/50 hover:bg-panel-2/60 cursor-pointer transition-colors"
                    onClick={() => setSelected(b)}
                  >
                    <td className="p-3">
                      <div className="font-semibold">{b.lead.name}</div>
                      <div className="text-txt-faint text-xs">{b.lead.phone}</div>
                    </td>
                    <td className="p-3">
                      <div className="font-medium">{b.property.projectName}</div>
                      <div className="text-txt-faint text-xs">{b.property.name} · {b.property.unitType}</div>
                    </td>
                    <td className="p-3 font-display font-bold text-gold-bright">{inrFull(b.amount)}</td>
                    <td className="p-3">{paymentBadge(b.paymentStatus)}</td>
                    <td className="p-3 text-txt-dim">{formatDate(b.createdAt)}</td>
                    <td className="p-3">
                      <button
                        className="btn btn-ghost text-xs px-2 py-1"
                        onClick={(e) => { e.stopPropagation(); downloadReceipt(b); }}
                        title="Download PDF Receipt"
                      >
                        <Icon name="Download" size={13} /> Receipt
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Booking Detail Panel */}
      {selected && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div
            className="card w-full max-w-2xl p-6 animate-fade-in max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-5">
              <div>
                <h3 className="font-display font-bold text-xl">{selected.lead.name}</h3>
                <p className="text-txt-dim text-sm">{selected.property.projectName} · {selected.property.name}</p>
              </div>
              <div className="flex items-center gap-2">
                {paymentBadge(selected.paymentStatus)}
                <button onClick={() => setSelected(null)} className="text-txt-faint hover:text-txt ml-2">
                  <Icon name="X" size={20} />
                </button>
              </div>
            </div>

            {/* Summary row */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="bg-bg-2 rounded-xl p-3 text-center">
                <div className="font-display font-bold text-gold-bright text-lg">{inr(selected.amount)}</div>
                <div className="text-[10px] text-txt-faint mt-0.5">Booking Amount</div>
              </div>
              <div className="bg-bg-2 rounded-xl p-3 text-center">
                <div className="font-display font-bold text-lg">{selected.property.sizeSqft.toLocaleString("en-IN")} sqft</div>
                <div className="text-[10px] text-txt-faint mt-0.5">Unit Size</div>
              </div>
              <div className="bg-bg-2 rounded-xl p-3 text-center">
                <div className="font-display font-bold text-lg">{inr(selected.property.pricePerSqft)}</div>
                <div className="text-[10px] text-txt-faint mt-0.5">Per sqft</div>
              </div>
            </div>

            {/* Payment Timeline */}
            <h4 className="font-display font-bold mb-4 flex items-center gap-2">
              <Icon name="CalendarCheck" size={16} className="text-gold-bright" />
              Payment Schedule
            </h4>
            <div className="space-y-2 mb-6">
              {(selected.schedule as ScheduleMilestone[]).map((m, i) => {
                const paid = m.status === "paid";
                return (
                  <div key={i} className="flex items-center gap-3">
                    {/* Timeline dot */}
                    <div className="flex flex-col items-center">
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${paid ? "bg-green border-green" : "bg-bg-2 border-line"}`}>
                        {paid && <Icon name="Check" size={10} className="text-bg" />}
                      </div>
                      {i < (selected.schedule as ScheduleMilestone[]).length - 1 && (
                        <div className={`w-0.5 h-6 ${paid ? "bg-green/40" : "bg-line/40"}`} />
                      )}
                    </div>
                    {/* Milestone */}
                    <div className="flex-1 flex items-center justify-between bg-bg-2 rounded-xl px-3 py-2.5">
                      <div>
                        <div className={`text-sm font-semibold ${paid ? "text-txt" : "text-txt-dim"}`}>{m.milestone}</div>
                        {m.dueDate && !paid && (
                          <div className="text-[11px] text-txt-faint">{m.dueDate}</div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className={`font-display font-bold text-sm ${paid ? "text-green" : "text-gold-bright"}`}>
                          {inr(selected.amount * m.pct / 100)}
                        </div>
                        <div className="text-[10px] text-txt-faint">{m.pct}%</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* EMI Breakdown */}
            <h4 className="font-display font-bold mb-3 flex items-center gap-2">
              <Icon name="Calculator" size={16} className="text-gold-bright" />
              EMI Estimate (10% down, 20yr @ 8.5%)
            </h4>
            <EmbeddedEMI propertyPrice={selected.property.totalPrice} />

            <div className="flex gap-2 mt-5">
              <button
                className="btn btn-primary flex-1 justify-center"
                onClick={() => downloadReceipt(selected)}
              >
                <Icon name="Download" size={15} /> Download Receipt
              </button>
              <button className="btn btn-ghost" onClick={() => setSelected(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* New Booking Modal */}
      {showNew && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="card w-full max-w-lg p-6 animate-fade-in">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display font-bold text-lg">New Booking</h3>
              <button onClick={() => setShowNew(false)} className="text-txt-faint hover:text-txt">
                <Icon name="X" size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="field-label">Select Available Unit *</label>
                <select
                  className="input"
                  value={form.propertyId}
                  onChange={(e) => onPropertyChange(e.target.value)}
                >
                  <option value="">— Choose a unit —</option>
                  {availableProperties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.projectName} · {p.name} ({p.unitType}, {p.sizeSqft} sqft) — {inr(p.totalPrice)}
                    </option>
                  ))}
                </select>
                {availableProperties.length === 0 && (
                  <p className="text-xs text-red mt-1">No available units. Add units in Inventory tab.</p>
                )}
              </div>

              <div>
                <label className="field-label">Client (Lead) *</label>
                <select
                  className="input"
                  value={form.leadId}
                  onChange={(e) => set("leadId", e.target.value)}
                >
                  <option value="">— Choose a lead —</option>
                  {leads.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name} · {l.phone}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="field-label">Booking Amount (₹) *</label>
                <input
                  className="input"
                  type="number"
                  value={form.amount}
                  onChange={(e) => set("amount", e.target.value)}
                  placeholder="e.g. 5000000"
                />
                {form.amount && (
                  <p className="text-xs text-txt-faint mt-1">{inrFull(Number(form.amount))}</p>
                )}
              </div>

              <div>
                <label className="field-label">Payment Status</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["TOKEN", "PAID_20", "FULL_PAID"] as PaymentStatus[]).map((s) => (
                    <button
                      key={s}
                      onClick={() => set("paymentStatus", s)}
                      className={`card p-2.5 text-center text-xs font-semibold transition-colors ${form.paymentStatus === s ? "border-gold text-gold-bright" : "text-txt-dim"}`}
                    >
                      {s === "TOKEN" ? "Token" : s === "PAID_20" ? "Paid 20%" : "Full Paid"}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button className="btn btn-ghost" onClick={() => setShowNew(false)}>Cancel</button>
              <button
                className="btn btn-primary ml-auto"
                disabled={busy || !form.propertyId || !form.leadId || !form.amount}
                onClick={createBooking}
              >
                {busy ? <Icon name="Loader2" size={15} className="animate-spin" /> : <Icon name="Check" size={15} />}
                Confirm Booking
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Embedded quick EMI in booking panel
function EmbeddedEMI({ propertyPrice }: { propertyPrice: number }) {
  const downPct = 10;
  const principal = propertyPrice * (1 - downPct / 100);
  const { emi, total, interest } = calcEMI(principal, 8.5, 20);

  return (
    <div className="grid grid-cols-3 gap-2 text-center">
      <div className="bg-bg-2 rounded-xl p-3">
        <div className="font-display font-bold text-gold-bright">{inr(emi)}</div>
        <div className="text-[10px] text-txt-faint mt-0.5">Monthly EMI</div>
      </div>
      <div className="bg-bg-2 rounded-xl p-3">
        <div className="font-display font-bold">{inr(total)}</div>
        <div className="text-[10px] text-txt-faint mt-0.5">Total Payable</div>
      </div>
      <div className="bg-bg-2 rounded-xl p-3">
        <div className="font-display font-bold text-red">{inr(interest)}</div>
        <div className="text-[10px] text-txt-faint mt-0.5">Interest Cost</div>
      </div>
    </div>
  );
}

// ─── Tab: Inventory Tracker ───────────────────────────────────────────────────

function InventoryTracker({
  properties,
  userRole,
}: {
  properties: Property[];
  userRole: Role;
}) {
  const router = useRouter();
  const [filterStatus, setFilterStatus] = useState<"" | PropertyStatus>("");
  const [filterProject, setFilterProject] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    name: "",
    projectName: "",
    unitType: "2BHK",
    sizeSqft: "",
    pricePerSqft: "",
    location: "",
    reraId: "",
  });

  const canEdit = ["SUPER_ADMIN", "ADMIN", "MANAGER"].includes(userRole as string);

  const projects = useMemo(() => [...new Set(properties.map((p) => p.projectName))], [properties]);

  const filtered = useMemo(() => {
    return properties.filter((p) => {
      if (filterStatus && p.status !== filterStatus) return false;
      if (filterProject && p.projectName !== filterProject) return false;
      return true;
    });
  }, [properties, filterStatus, filterProject]);

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function addUnit() {
    if (!form.name || !form.projectName || !form.sizeSqft || !form.pricePerSqft) return;
    setBusy(true);
    try {
      const res = await fetch("/api/properties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          sizeSqft: Number(form.sizeSqft),
          pricePerSqft: Number(form.pricePerSqft),
        }),
      });
      if (res.ok) {
        setShowAdd(false);
        setForm({ name: "", projectName: "", unitType: "2BHK", sizeSqft: "", pricePerSqft: "", location: "", reraId: "" });
        router.refresh();
      } else {
        const j = await res.json().catch(() => ({}));
        alert(j.error || "Failed to add unit");
      }
    } finally {
      setBusy(false);
    }
  }

  async function toggleStatus(property: Property) {
    if (!canEdit) return;
    const next: PropertyStatus =
      property.status === "AVAILABLE" ? "HELD" : property.status === "HELD" ? "AVAILABLE" : "AVAILABLE";
    await fetch(`/api/properties/${property.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    router.refresh();
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="flex gap-2 flex-1 min-w-0">
          <select
            className="input w-auto"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
          >
            <option value="">All Statuses</option>
            <option value="AVAILABLE">Available</option>
            <option value="HELD">Held</option>
            <option value="SOLD">Sold</option>
          </select>
          <select
            className="input w-auto"
            value={filterProject}
            onChange={(e) => setFilterProject(e.target.value)}
          >
            <option value="">All Projects</option>
            {projects.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
        {canEdit && (
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
            <Icon name="Plus" size={15} /> Add Unit
          </button>
        )}
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {(["AVAILABLE", "HELD", "SOLD"] as PropertyStatus[]).map((s) => {
          const count = properties.filter((p) => p.status === s).length;
          const tone = s === "AVAILABLE" ? "text-green" : s === "HELD" ? "text-gold-bright" : "text-red";
          return (
            <div key={s} className="card p-4 text-center cursor-pointer hover:border-gold/40 transition-colors"
              onClick={() => setFilterStatus(filterStatus === s ? "" : s)}>
              <div className={`font-display font-bold text-2xl ${tone}`}>{count}</div>
              <div className="text-[11px] text-txt-faint mt-1">{s.charAt(0) + s.slice(1).toLowerCase()}</div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon="Building2"
          title="No units found"
          hint="Add your first unit or change the filter."
        />
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((p) => (
            <Card key={p.id} className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="font-display font-bold">{p.name}</div>
                  <div className="text-txt-faint text-xs mt-0.5">{p.projectName}</div>
                </div>
                {statusBadge(p.status)}
              </div>

              <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm mb-4">
                <div>
                  <div className="text-[10px] text-txt-faint uppercase tracking-wide">Type</div>
                  <div className="font-semibold">{p.unitType}</div>
                </div>
                <div>
                  <div className="text-[10px] text-txt-faint uppercase tracking-wide">Size</div>
                  <div className="font-semibold">{p.sizeSqft.toLocaleString("en-IN")} sqft</div>
                </div>
                <div>
                  <div className="text-[10px] text-txt-faint uppercase tracking-wide">Price/sqft</div>
                  <div className="font-semibold">{inrFull(p.pricePerSqft)}</div>
                </div>
                <div>
                  <div className="text-[10px] text-txt-faint uppercase tracking-wide">Total Price</div>
                  <div className="font-display font-bold text-gold-bright">{inr(p.totalPrice)}</div>
                </div>
              </div>

              {p.location && (
                <div className="flex items-center gap-1.5 text-txt-faint text-xs mb-3">
                  <Icon name="MapPin" size={11} />
                  {p.location}
                </div>
              )}

              {canEdit && p.status !== "SOLD" && (
                <button
                  className="btn btn-ghost w-full justify-center text-xs"
                  onClick={() => toggleStatus(p)}
                >
                  <Icon name="RefreshCcw" size={12} />
                  Toggle {p.status === "AVAILABLE" ? "→ Held" : "→ Available"}
                </button>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Add Unit Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="card w-full max-w-lg p-6 animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display font-bold text-lg">Add Unit to Inventory</h3>
              <button onClick={() => setShowAdd(false)} className="text-txt-faint hover:text-txt">
                <Icon name="X" size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="field-label">Project Name *</label>
                  <input className="input" value={form.projectName} onChange={(e) => set("projectName", e.target.value)} placeholder="Shubh Residency" />
                </div>
                <div>
                  <label className="field-label">Unit Name *</label>
                  <input className="input" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="B-204" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="field-label">Unit Type</label>
                  <select className="input" value={form.unitType} onChange={(e) => set("unitType", e.target.value)}>
                    {["1BHK", "2BHK", "3BHK", "4BHK", "Villa", "Plot", "Commercial"].map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="field-label">Size (sqft) *</label>
                  <input className="input" type="number" value={form.sizeSqft} onChange={(e) => set("sizeSqft", e.target.value)} placeholder="1200" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="field-label">Price per sqft (₹) *</label>
                  <input className="input" type="number" value={form.pricePerSqft} onChange={(e) => set("pricePerSqft", e.target.value)} placeholder="5500" />
                </div>
                <div>
                  <label className="field-label">Total Price (auto)</label>
                  <input
                    className="input bg-bg-2 text-txt-dim cursor-default"
                    readOnly
                    value={form.sizeSqft && form.pricePerSqft ? inrFull(Number(form.sizeSqft) * Number(form.pricePerSqft)) : "—"}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="field-label">Location</label>
                  <input className="input" value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="Mansarovar, Jaipur" />
                </div>
                <div>
                  <label className="field-label">RERA ID</label>
                  <input className="input" value={form.reraId} onChange={(e) => set("reraId", e.target.value)} placeholder="RAJ/P/2024/001" />
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button className="btn btn-ghost" onClick={() => setShowAdd(false)}>Cancel</button>
              <button
                className="btn btn-primary ml-auto"
                disabled={busy || !form.name || !form.projectName || !form.sizeSqft || !form.pricePerSqft}
                onClick={addUnit}
              >
                {busy ? <Icon name="Loader2" size={15} className="animate-spin" /> : <Icon name="Plus" size={15} />}
                Add Unit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tab: Calculators ─────────────────────────────────────────────────────────

function Calculators() {
  // GST Calculator state
  const [gstAmount, setGstAmount] = useState("5000000");
  const [gstRate, setGstRate] = useState(5);

  // Stamp Duty state
  const [sdAmount, setSdAmount] = useState("5000000");
  const [sdStampRate, setSdStampRate] = useState(6);
  const [sdRegRate, setSdRegRate] = useState(1);

  // EMI Calculator state
  const [emiPrincipal, setEmiPrincipal] = useState("4500000");
  const [emiRate, setEmiRate] = useState(8.5);
  const [emiTenure, setEmiTenure] = useState(20);

  // Brokerage Calculator state
  const [brokerDeal, setBrokerDeal] = useState("5000000");
  const [brokerRate, setBrokerRate] = useState(2);

  // Computed values
  const gstVal = Number(gstAmount) * (gstRate / 100);
  const gstTotal = Number(gstAmount) + gstVal;

  const sdStamp = Number(sdAmount) * (sdStampRate / 100);
  const sdReg = Number(sdAmount) * (sdRegRate / 100);
  const sdTotal = Number(sdAmount) + sdStamp + sdReg;

  const { emi, total: emiTotal, interest: emiInterest } = calcEMI(Number(emiPrincipal), emiRate, emiTenure);
  const emiRows = amortization(Number(emiPrincipal), emiRate, emiTenure);

  const brokerageAmt = Number(brokerDeal) * (brokerRate / 100);

  return (
    <div className="grid lg:grid-cols-2 gap-5">
      {/* GST Calculator */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="grid place-items-center w-8 h-8 rounded-lg bg-gold-soft text-gold-bright">
            <Icon name="Percent" size={16} />
          </div>
          <h3 className="font-display font-bold text-base">GST Calculator</h3>
        </div>

        <div className="space-y-3 mb-4">
          <div>
            <label className="field-label">Property Value (₹)</label>
            <input className="input" type="number" value={gstAmount} onChange={(e) => setGstAmount(e.target.value)} />
          </div>
          <div>
            <label className="field-label">GST Rate</label>
            <div className="flex gap-2">
              {[1, 5, 12, 18].map((r) => (
                <button
                  key={r}
                  onClick={() => setGstRate(r)}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${gstRate === r ? "bg-gold text-[#1a1205]" : "bg-bg-2 text-txt-dim hover:bg-panel-2"}`}
                >
                  {r}%
                </button>
              ))}
            </div>
            <p className="text-[11px] text-txt-faint mt-1">5% = under-construction · 12% = commercial</p>
          </div>
        </div>

        <div className="bg-bg-2 rounded-xl p-4 space-y-2.5">
          <div className="flex justify-between text-sm">
            <span className="text-txt-dim">Base Value</span>
            <span className="font-semibold">{inrFull(Number(gstAmount) || 0)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-txt-dim">GST ({gstRate}%)</span>
            <span className="font-semibold text-red">{inrFull(gstVal || 0)}</span>
          </div>
          <div className="h-px bg-line" />
          <div className="flex justify-between">
            <span className="font-display font-bold">Total Payable</span>
            <span className="font-display font-bold text-gold-bright text-lg">{inrFull(gstTotal || 0)}</span>
          </div>
        </div>
      </Card>

      {/* Stamp Duty */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="grid place-items-center w-8 h-8 rounded-lg bg-gold-soft text-gold-bright">
            <Icon name="Stamp" size={16} />
          </div>
          <h3 className="font-display font-bold text-base">Stamp Duty & Registration</h3>
        </div>

        <div className="space-y-3 mb-4">
          <div>
            <label className="field-label">Agreement Value (₹)</label>
            <input className="input" type="number" value={sdAmount} onChange={(e) => setSdAmount(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="field-label">Stamp Duty %</label>
              <input className="input" type="number" step="0.5" value={sdStampRate} onChange={(e) => setSdStampRate(Number(e.target.value))} />
            </div>
            <div>
              <label className="field-label">Registration %</label>
              <input className="input" type="number" step="0.5" value={sdRegRate} onChange={(e) => setSdRegRate(Number(e.target.value))} />
            </div>
          </div>
          <p className="text-[11px] text-txt-faint">Rajasthan: Stamp Duty ~6% · Registration ~1%</p>
        </div>

        <div className="bg-bg-2 rounded-xl p-4 space-y-2.5">
          <div className="flex justify-between text-sm">
            <span className="text-txt-dim">Agreement Value</span>
            <span className="font-semibold">{inrFull(Number(sdAmount) || 0)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-txt-dim">Stamp Duty ({sdStampRate}%)</span>
            <span className="font-semibold text-red">{inrFull(sdStamp || 0)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-txt-dim">Registration ({sdRegRate}%)</span>
            <span className="font-semibold text-red">{inrFull(sdReg || 0)}</span>
          </div>
          <div className="h-px bg-line" />
          <div className="flex justify-between">
            <span className="font-display font-bold">Total Cost</span>
            <span className="font-display font-bold text-gold-bright text-lg">{inrFull(sdTotal || 0)}</span>
          </div>
        </div>
      </Card>

      {/* EMI Calculator */}
      <Card className="p-5 lg:col-span-2">
        <div className="flex items-center gap-2 mb-4">
          <div className="grid place-items-center w-8 h-8 rounded-lg bg-gold-soft text-gold-bright">
            <Icon name="Calculator" size={16} />
          </div>
          <h3 className="font-display font-bold text-base">EMI Calculator</h3>
        </div>

        <div className="grid sm:grid-cols-3 gap-4 mb-5">
          <div>
            <label className="field-label">Loan Amount (₹)</label>
            <input className="input" type="number" value={emiPrincipal} onChange={(e) => setEmiPrincipal(e.target.value)} />
            {emiPrincipal && <p className="text-[11px] text-txt-faint mt-1">{inr(Number(emiPrincipal))}</p>}
          </div>
          <div>
            <label className="field-label">Annual Interest Rate (%)</label>
            <input className="input" type="number" step="0.1" value={emiRate} onChange={(e) => setEmiRate(Number(e.target.value))} />
          </div>
          <div>
            <label className="field-label">Tenure (years)</label>
            <input className="input" type="number" value={emiTenure} onChange={(e) => setEmiTenure(Number(e.target.value))} />
          </div>
        </div>

        {/* Result summary */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="bg-gold-soft/30 rounded-xl p-4 text-center border border-gold/20">
            <div className="text-[10px] uppercase tracking-wide text-txt-faint mb-1">Monthly EMI</div>
            <div className="font-display font-bold text-gold-bright text-2xl">{inr(emi)}</div>
            <div className="text-[11px] text-txt-faint mt-0.5">{inrFull(emi)}</div>
          </div>
          <div className="bg-bg-2 rounded-xl p-4 text-center">
            <div className="text-[10px] uppercase tracking-wide text-txt-faint mb-1">Total Payable</div>
            <div className="font-display font-bold text-xl">{inr(emiTotal)}</div>
            <div className="text-[11px] text-txt-faint mt-0.5">{inrFull(emiTotal)}</div>
          </div>
          <div className="bg-bg-2 rounded-xl p-4 text-center">
            <div className="text-[10px] uppercase tracking-wide text-txt-faint mb-1">Total Interest</div>
            <div className="font-display font-bold text-red text-xl">{inr(emiInterest)}</div>
            <div className="text-[11px] text-txt-faint mt-0.5">{inrFull(emiInterest)}</div>
          </div>
        </div>

        {/* Amortization mini table */}
        {emi > 0 && (
          <div>
            <h4 className="text-[11px] uppercase tracking-wide text-txt-faint font-semibold mb-2">Amortization Preview (first 12 months)</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-line">
                    <th className="text-left p-2 text-txt-faint font-semibold">Month</th>
                    <th className="text-right p-2 text-txt-faint font-semibold">EMI</th>
                    <th className="text-right p-2 text-txt-faint font-semibold">Principal</th>
                    <th className="text-right p-2 text-txt-faint font-semibold">Interest</th>
                    <th className="text-right p-2 text-txt-faint font-semibold">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {emiRows.map((r) => (
                    <tr key={r.month} className="border-b border-line/40 hover:bg-panel-2/40 transition-colors">
                      <td className="p-2 font-semibold">{r.month}</td>
                      <td className="p-2 text-right">{inr(r.emi)}</td>
                      <td className="p-2 text-right text-green">{inr(r.principal)}</td>
                      <td className="p-2 text-right text-red">{inr(r.interest)}</td>
                      <td className="p-2 text-right text-txt-dim">{inr(r.balance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Card>

      {/* Brokerage Calculator */}
      <Card className="p-5 lg:col-span-2">
        <div className="flex items-center gap-2 mb-4">
          <div className="grid place-items-center w-8 h-8 rounded-lg bg-gold-soft text-gold-bright">
            <Icon name="Handshake" size={16} />
          </div>
          <h3 className="font-display font-bold text-base">Brokerage / Commission Calculator</h3>
        </div>

        <div className="grid sm:grid-cols-3 gap-4 items-end mb-5">
          <div>
            <label className="field-label">Deal Value (₹)</label>
            <input className="input" type="number" value={brokerDeal} onChange={(e) => setBrokerDeal(e.target.value)} />
            {brokerDeal && <p className="text-[11px] text-txt-faint mt-1">{inr(Number(brokerDeal))}</p>}
          </div>
          <div>
            <label className="field-label">Commission Rate (%)</label>
            <input className="input" type="number" step="0.25" value={brokerRate} onChange={(e) => setBrokerRate(Number(e.target.value))} />
            <div className="flex gap-1.5 mt-1.5">
              {[1, 1.5, 2, 2.5, 3].map((r) => (
                <button
                  key={r}
                  onClick={() => setBrokerRate(r)}
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${brokerRate === r ? "bg-gold text-[#1a1205]" : "bg-bg-2 text-txt-faint"}`}
                >
                  {r}%
                </button>
              ))}
            </div>
          </div>
          <div className="bg-gold-soft/30 border border-gold/20 rounded-xl p-4 text-center">
            <div className="text-[10px] uppercase tracking-wide text-txt-faint mb-1">Commission Earned</div>
            <div className="font-display font-bold text-gold-bright text-2xl">{inrFull(brokerageAmt || 0)}</div>
            <div className="text-[11px] text-txt-faint mt-0.5">{inr(brokerageAmt || 0)} on {inr(Number(brokerDeal) || 0)} deal</div>
          </div>
        </div>

        {/* GST on brokerage */}
        <div className="bg-bg-2 rounded-xl p-4 grid sm:grid-cols-3 gap-3 text-center text-sm">
          <div>
            <div className="text-txt-faint text-xs mb-1">Brokerage (ex-GST)</div>
            <div className="font-display font-bold">{inrFull(brokerageAmt || 0)}</div>
          </div>
          <div>
            <div className="text-txt-faint text-xs mb-1">GST on Brokerage (18%)</div>
            <div className="font-display font-bold text-red">{inrFull(brokerageAmt * 0.18 || 0)}</div>
          </div>
          <div>
            <div className="text-txt-faint text-xs mb-1">Total Receivable (with GST)</div>
            <div className="font-display font-bold text-gold-bright">{inrFull(brokerageAmt * 1.18 || 0)}</div>
          </div>
        </div>
      </Card>
    </div>
  );
}

// ─── Main Client ──────────────────────────────────────────────────────────────

const TABS = [
  { key: "bookings", label: "Booking Register", icon: "FileCheck2" },
  { key: "inventory", label: "Inventory Tracker", icon: "Building2" },
  { key: "calculators", label: "Calculators", icon: "Calculator" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export function FinanceClient({ bookings, properties, leads, userRole }: Props) {
  const [tab, setTab] = useState<TabKey>("bookings");

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-1 p-1 bg-bg-2 rounded-xl mb-6 w-fit">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab === t.key
                ? "bg-gold text-[#1a1205] shadow-sm"
                : "text-txt-dim hover:text-txt"
            }`}
          >
            <Icon name={t.icon} size={14} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "bookings" && (
        <BookingRegister bookings={bookings} properties={properties} leads={leads} />
      )}
      {tab === "inventory" && (
        <InventoryTracker properties={properties} userRole={userRole} />
      )}
      {tab === "calculators" && <Calculators />}
    </div>
  );
}
