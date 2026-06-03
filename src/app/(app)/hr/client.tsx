"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, Badge, EmptyState } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { inrFull, initials, timeAgo } from "@/lib/format";
import { AttendanceStatus, LeaveStatus } from "@prisma/client";
import jsPDF from "jspdf";

// ─── Types ────────────────────────────────────────────────────────────────────

interface StaffUser {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarColor: string;
}

interface AttendanceRecord {
  id: string;
  userId: string;
  date: string;
  status: AttendanceStatus;
  checkIn?: string | null;
  checkOut?: string | null;
}

interface LeaveRecord {
  id: string;
  userId: string;
  type: string;
  from: string;
  to: string;
  reason?: string | null;
  status: LeaveStatus;
  user: { id: string; name: string; avatarColor: string };
}

interface SalarySlipRecord {
  id: string;
  userId: string;
  month: string;
  gross: number;
  deductions: number;
  net: number;
  user?: { id: string; name: string } | null;
}

interface OfferLetterRecord {
  id: string;
  candidate: string;
  role: string;
  ctc: number;
  url?: string | null;
  createdAt: string;
}

interface DocumentRecord {
  id: string;
  userId?: string | null;
  type: string;
  name: string;
  url: string;
  createdAt: string;
  user?: { id: string; name: string } | null;
}

interface HRClientProps {
  users: StaffUser[];
  attendance: AttendanceRecord[];
  leaves: LeaveRecord[];
  salarySlips: (SalarySlipRecord & { user?: { id: string; name: string } | null })[];
  offerLetters: OfferLetterRecord[];
  documents: DocumentRecord[];
  currentUserRole: string;
  currentUserId: string;
  tenantName: string;
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

const TABS = [
  { key: "attendance", label: "Attendance", icon: "CalendarCheck" },
  { key: "leave", label: "Leave", icon: "CalendarOff" },
  { key: "salary", label: "Salary Slips", icon: "Receipt" },
  { key: "offers", label: "Offer Letters", icon: "FileText" },
  { key: "documents", label: "Documents", icon: "FolderOpen" },
  { key: "tasks", label: "Tasks", icon: "CheckSquare" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getWorkingDays(n: number): string[] {
  const days: string[] = [];
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  while (days.length < n) {
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) {
      days.push(d.toISOString().slice(0, 10));
    }
    d.setDate(d.getDate() - 1);
  }
  return days;
}

function attendanceColor(status: AttendanceStatus | undefined): string {
  if (!status) return "bg-panel-2 text-txt-faint";
  switch (status) {
    case "PRESENT":
      return "bg-[rgba(62,199,141,.18)] text-green font-semibold";
    case "WFH":
      return "bg-[rgba(91,141,239,.18)] text-blue font-semibold";
    case "HALF_DAY":
      return "bg-[rgba(240,193,75,.18)] text-gold-bright font-semibold";
    case "LEAVE":
    case "ABSENT":
      return "bg-[rgba(240,85,106,.18)] text-red font-semibold";
    default:
      return "bg-panel-2 text-txt-faint";
  }
}

function attendanceLabel(status: AttendanceStatus | undefined): string {
  if (!status) return "–";
  switch (status) {
    case "PRESENT": return "P";
    case "ABSENT": return "A";
    case "HALF_DAY": return "H";
    case "LEAVE": return "L";
    case "WFH": return "W";
    default: return "–";
  }
}

function leaveStatusBadge(status: LeaveStatus) {
  switch (status) {
    case "PENDING": return <Badge tone="gold">Pending</Badge>;
    case "APPROVED": return <Badge tone="green">Approved</Badge>;
    case "REJECTED": return <Badge tone="red">Rejected</Badge>;
  }
}

function leaveDays(from: string, to: string): number {
  const f = new Date(from);
  const t = new Date(to);
  return Math.max(1, Math.ceil((t.getTime() - f.getTime()) / 86400000) + 1);
}

function monthLabel(m: string): string {
  const [y, mo] = m.split("-");
  const d = new Date(parseInt(y), parseInt(mo) - 1, 1);
  return d.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

// ─── LocalStorage Task Types ──────────────────────────────────────────────────

type TaskStatus = "todo" | "doing" | "done";

interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  createdAt: number;
}

// ─── Modal ────────────────────────────────────────────────────────────────────

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="card w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display font-bold text-lg">{title}</h3>
          <button onClick={onClose} className="btn btn-ghost p-1.5">
            <Icon name="X" size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ name, color, size = "sm" }: { name: string; color?: string; size?: "sm" | "md" }) {
  const cls = size === "md" ? "w-10 h-10 text-[13px]" : "w-8 h-8 text-[11px]";
  return (
    <span
      className={`grid place-items-center rounded-full font-bold text-[#1a1205] flex-shrink-0 ${cls}`}
      style={{ background: color ?? "#d9a441" }}
    >
      {initials(name)}
    </span>
  );
}

// ─── Attendance Tab ───────────────────────────────────────────────────────────

function AttendanceTab({
  users,
  attendance,
  currentUserRole,
  currentUserId,
}: {
  users: StaffUser[];
  attendance: AttendanceRecord[];
  currentUserRole: string;
  currentUserId: string;
}) {
  const router = useRouter();
  const workDays = getWorkingDays(10);
  const today = new Date().toISOString().slice(0, 10);

  const [marking, setMarking] = useState(false);
  const [form, setForm] = useState({
    userId: currentUserId,
    date: today,
    status: "PRESENT" as AttendanceStatus,
    checkIn: "09:30",
    checkOut: "18:30",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isManager = ["ADMIN", "MANAGER", "SUPER_ADMIN"].includes(currentUserRole);

  // Build lookup: userId+date -> status
  const lookup = new Map<string, AttendanceRecord>();
  for (const a of attendance) {
    const dateKey = new Date(a.date).toISOString().slice(0, 10);
    lookup.set(`${a.userId}:${dateKey}`, a);
  }

  async function handleMark(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/hr/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const j = await res.json();
        setError(j.error ?? "Failed");
      } else {
        setMarking(false);
        router.refresh();
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-semibold text-lg">Attendance Register</h3>
        <button className="btn btn-primary gap-2" onClick={() => setMarking(true)}>
          <Icon name="CheckCircle" size={15} />
          Mark Attendance
        </button>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mb-4 text-xs text-txt-dim">
        {[
          { label: "Present", cls: "bg-[rgba(62,199,141,.18)] text-green" },
          { label: "WFH", cls: "bg-[rgba(91,141,239,.18)] text-blue" },
          { label: "Half Day", cls: "bg-[rgba(240,193,75,.18)] text-gold-bright" },
          { label: "Absent/Leave", cls: "bg-[rgba(240,85,106,.18)] text-red" },
        ].map((l) => (
          <span key={l.label} className={`tag ${l.cls}`}>{l.label}</span>
        ))}
      </div>

      {/* Grid table */}
      <div className="overflow-x-auto rounded-[16px] border border-line">
        <table className="w-full text-sm border-collapse min-w-[640px]">
          <thead>
            <tr className="bg-panel-2">
              <th className="text-left px-4 py-3 font-semibold text-txt-dim text-[11px] uppercase tracking-wide sticky left-0 bg-panel-2 z-10">
                Staff
              </th>
              {workDays.map((d) => {
                const dt = new Date(d);
                return (
                  <th
                    key={d}
                    className="px-2 py-3 font-semibold text-txt-dim text-[11px] uppercase tracking-wide text-center min-w-[56px]"
                  >
                    <div>{dt.toLocaleDateString("en-IN", { weekday: "short" })}</div>
                    <div className="text-[10px] text-txt-faint">
                      {dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={workDays.length + 1} className="text-center py-10 text-txt-faint">
                  No staff found
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className="border-t border-line hover:bg-panel-2/50 transition-colors">
                  <td className="px-4 py-3 sticky left-0 bg-bg z-10">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={u.name} color={u.avatarColor} />
                      <div>
                        <div className="font-medium text-[13px] leading-tight">{u.name}</div>
                        <div className="text-[11px] text-txt-faint">{u.role}</div>
                      </div>
                    </div>
                  </td>
                  {workDays.map((d) => {
                    const rec = lookup.get(`${u.id}:${d}`);
                    return (
                      <td key={d} className="px-2 py-3 text-center">
                        <span
                          className={`inline-flex w-8 h-8 rounded-lg items-center justify-center text-[12px] ${attendanceColor(rec?.status)}`}
                        >
                          {attendanceLabel(rec?.status)}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mark modal */}
      {marking && (
        <Modal title="Mark Attendance" onClose={() => { setMarking(false); setError(""); }}>
          <form onSubmit={handleMark} className="space-y-4">
            {isManager && (
              <div>
                <label className="field-label">Staff Member</label>
                <select
                  className="input w-full"
                  value={form.userId}
                  onChange={(e) => setForm((p) => ({ ...p, userId: e.target.value }))}
                >
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="field-label">Date</label>
              <input
                type="date"
                className="input w-full"
                value={form.date}
                max={today}
                onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
              />
            </div>
            <div>
              <label className="field-label">Status</label>
              <select
                className="input w-full"
                value={form.status}
                onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as AttendanceStatus }))}
              >
                <option value="PRESENT">Present</option>
                <option value="WFH">Work From Home</option>
                <option value="HALF_DAY">Half Day</option>
                <option value="ABSENT">Absent</option>
                <option value="LEAVE">On Leave</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="field-label">Check In</label>
                <input
                  type="time"
                  className="input w-full"
                  value={form.checkIn}
                  onChange={(e) => setForm((p) => ({ ...p, checkIn: e.target.value }))}
                />
              </div>
              <div>
                <label className="field-label">Check Out</label>
                <input
                  type="time"
                  className="input w-full"
                  value={form.checkOut}
                  onChange={(e) => setForm((p) => ({ ...p, checkOut: e.target.value }))}
                />
              </div>
            </div>
            {error && <p className="text-red text-sm">{error}</p>}
            <div className="flex gap-3 pt-1">
              <button type="submit" className="btn btn-primary flex-1" disabled={loading}>
                {loading ? "Saving…" : "Save Attendance"}
              </button>
              <button type="button" className="btn btn-ghost flex-1" onClick={() => { setMarking(false); setError(""); }}>
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

// ─── Leave Tab ────────────────────────────────────────────────────────────────

function LeaveTab({
  leaves: initialLeaves,
  currentUserRole,
  currentUserId,
}: {
  leaves: LeaveRecord[];
  currentUserRole: string;
  currentUserId: string;
}) {
  const router = useRouter();
  const [applying, setApplying] = useState(false);
  const [form, setForm] = useState({ type: "CASUAL", from: "", to: "", reason: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const isManager = ["ADMIN", "MANAGER", "SUPER_ADMIN"].includes(currentUserRole);

  async function handleApply(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/hr/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const j = await res.json();
        setError(j.error ?? "Failed");
      } else {
        setApplying(false);
        setForm({ type: "CASUAL", from: "", to: "", reason: "" });
        router.refresh();
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  async function handleDecide(id: string, status: "APPROVED" | "REJECTED") {
    setActionLoading(id + status);
    try {
      const res = await fetch(`/api/hr/leave/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) router.refresh();
    } finally {
      setActionLoading(null);
    }
  }

  const sorted = [...initialLeaves].sort(
    (a, b) => new Date(b.from).getTime() - new Date(a.from).getTime()
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-semibold text-lg">Leave Requests</h3>
        <button className="btn btn-primary gap-2" onClick={() => setApplying(true)}>
          <Icon name="Plus" size={15} />
          Apply Leave
        </button>
      </div>

      {sorted.length === 0 ? (
        <EmptyState icon="CalendarOff" title="No leave requests" hint="Apply for leave using the button above." />
      ) : (
        <div className="space-y-3">
          {sorted.map((l) => (
            <Card key={l.id} className="p-4">
              <div className="flex flex-wrap items-start gap-3">
                <Avatar name={l.user.name} color={l.user.avatarColor} size="md" />
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="font-semibold text-[14px]">{l.user.name}</span>
                    <span className="tag bg-panel-2 text-txt-dim">{l.type}</span>
                    {leaveStatusBadge(l.status)}
                  </div>
                  <div className="text-sm text-txt-dim">
                    {new Date(l.from).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    {" → "}
                    {new Date(l.to).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    {" · "}
                    <span className="text-txt">{leaveDays(l.from, l.to)} day{leaveDays(l.from, l.to) > 1 ? "s" : ""}</span>
                  </div>
                  {l.reason && (
                    <div className="text-sm text-txt-faint mt-1 italic">"{l.reason}"</div>
                  )}
                </div>
                {isManager && l.status === "PENDING" && (
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      className="btn btn-ghost gap-1.5 text-green border border-green/30 hover:bg-green/10 text-xs py-1.5"
                      disabled={actionLoading !== null}
                      onClick={() => handleDecide(l.id, "APPROVED")}
                    >
                      {actionLoading === l.id + "APPROVED" ? "…" : <><Icon name="CheckCircle" size={13} /> Approve</>}
                    </button>
                    <button
                      className="btn btn-ghost gap-1.5 text-red border border-red/30 hover:bg-red/10 text-xs py-1.5"
                      disabled={actionLoading !== null}
                      onClick={() => handleDecide(l.id, "REJECTED")}
                    >
                      {actionLoading === l.id + "REJECTED" ? "…" : <><Icon name="XCircle" size={13} /> Reject</>}
                    </button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {applying && (
        <Modal title="Apply for Leave" onClose={() => { setApplying(false); setError(""); }}>
          <form onSubmit={handleApply} className="space-y-4">
            <div>
              <label className="field-label">Leave Type</label>
              <select
                className="input w-full"
                value={form.type}
                onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}
              >
                <option value="CASUAL">Casual Leave</option>
                <option value="SICK">Sick Leave</option>
                <option value="EARNED">Earned Leave</option>
                <option value="UNPAID">Unpaid Leave</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="field-label">From</label>
                <input
                  type="date"
                  className="input w-full"
                  required
                  value={form.from}
                  onChange={(e) => setForm((p) => ({ ...p, from: e.target.value }))}
                />
              </div>
              <div>
                <label className="field-label">To</label>
                <input
                  type="date"
                  className="input w-full"
                  required
                  value={form.to}
                  min={form.from}
                  onChange={(e) => setForm((p) => ({ ...p, to: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <label className="field-label">Reason (optional)</label>
              <textarea
                className="input w-full min-h-[80px] resize-none"
                placeholder="Brief reason for leave…"
                value={form.reason}
                onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))}
              />
            </div>
            {error && <p className="text-red text-sm">{error}</p>}
            <div className="flex gap-3 pt-1">
              <button type="submit" className="btn btn-primary flex-1" disabled={loading}>
                {loading ? "Submitting…" : "Submit Request"}
              </button>
              <button type="button" className="btn btn-ghost flex-1" onClick={() => { setApplying(false); setError(""); }}>
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

// ─── Salary Slips Tab ─────────────────────────────────────────────────────────

function SalaryTab({
  salarySlips,
  tenantName,
}: {
  salarySlips: (SalarySlipRecord & { user?: { id: string; name: string } | null })[];
  tenantName: string;
}) {
  function downloadSlip(slip: SalarySlipRecord & { user?: { id: string; name: string } | null }) {
    const doc = new jsPDF();
    const empName = slip.user?.name ?? "Employee";
    const gross = Number(slip.gross);
    const deductions = Number(slip.deductions);
    const net = Number(slip.net);

    // Header
    doc.setFillColor(217, 164, 65);
    doc.rect(0, 0, 210, 32, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text(tenantName, 15, 14);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Salary Slip", 15, 23);

    // Details section
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Employee Details", 15, 46);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Employee Name: ${empName}`, 15, 56);
    doc.text(`Month: ${monthLabel(slip.month)}`, 15, 64);
    doc.text(`Generated: ${new Date().toLocaleDateString("en-IN")}`, 15, 72);

    // Divider
    doc.setDrawColor(217, 164, 65);
    doc.setLineWidth(0.5);
    doc.line(15, 80, 195, 80);

    // Earnings table
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Earnings", 15, 92);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const basicPay = gross * 0.5;
    const hra = gross * 0.3;
    const special = gross * 0.2;
    doc.text("Basic Pay", 20, 103);
    doc.text(inrFull(basicPay), 150, 103);
    doc.text("House Rent Allowance (HRA)", 20, 113);
    doc.text(inrFull(hra), 150, 113);
    doc.text("Special Allowance", 20, 123);
    doc.text(inrFull(special), 150, 123);

    doc.setDrawColor(220, 220, 220);
    doc.line(15, 130, 195, 130);
    doc.setFont("helvetica", "bold");
    doc.text("Gross Earnings", 20, 140);
    doc.text(inrFull(gross), 150, 140);

    // Deductions
    doc.text("Deductions", 15, 155);
    doc.setFont("helvetica", "normal");
    const pf = deductions * 0.6;
    const tax = deductions * 0.4;
    doc.text("Provident Fund (PF)", 20, 166);
    doc.text(inrFull(pf), 150, 166);
    doc.text("Income Tax (TDS)", 20, 176);
    doc.text(inrFull(tax), 150, 176);

    doc.line(15, 183, 195, 183);
    doc.setFont("helvetica", "bold");
    doc.text("Total Deductions", 20, 193);
    doc.text(inrFull(deductions), 150, 193);

    // Net Pay
    doc.setFillColor(240, 193, 75);
    doc.rect(12, 202, 186, 18, "F");
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(13);
    doc.text("Net Pay", 20, 214);
    doc.text(inrFull(net), 148, 214);

    // Footer
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(150, 150, 150);
    doc.text("This is a computer-generated salary slip and does not require a signature.", 15, 240);
    doc.text(`${tenantName} · Jaipur, Rajasthan`, 15, 248);

    doc.save(`Salary-Slip-${empName.replace(/\s+/g, "-")}-${slip.month}.pdf`);
  }

  const sorted = [...salarySlips].sort((a, b) => b.month.localeCompare(a.month));

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-semibold text-lg">Salary Slips</h3>
      </div>
      {sorted.length === 0 ? (
        <EmptyState icon="Receipt" title="No salary slips" hint="Salary slips will appear here once generated." />
      ) : (
        <div className="overflow-x-auto rounded-[16px] border border-line">
          <table className="w-full text-sm min-w-[560px]">
            <thead>
              <tr className="bg-panel-2">
                <th className="text-left px-4 py-3 font-semibold text-txt-dim text-[11px] uppercase tracking-wide">Employee</th>
                <th className="text-left px-4 py-3 font-semibold text-txt-dim text-[11px] uppercase tracking-wide">Month</th>
                <th className="text-right px-4 py-3 font-semibold text-txt-dim text-[11px] uppercase tracking-wide">Gross</th>
                <th className="text-right px-4 py-3 font-semibold text-txt-dim text-[11px] uppercase tracking-wide">Deductions</th>
                <th className="text-right px-4 py-3 font-semibold text-txt-dim text-[11px] uppercase tracking-wide">Net Pay</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((s) => (
                <tr key={s.id} className="border-t border-line hover:bg-panel-2/40 transition-colors">
                  <td className="px-4 py-3 font-medium">{s.user?.name ?? "–"}</td>
                  <td className="px-4 py-3 text-txt-dim">{monthLabel(s.month)}</td>
                  <td className="px-4 py-3 text-right text-green font-semibold">{inrFull(Number(s.gross))}</td>
                  <td className="px-4 py-3 text-right text-red">{inrFull(Number(s.deductions))}</td>
                  <td className="px-4 py-3 text-right text-gold-bright font-bold">{inrFull(Number(s.net))}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      className="btn btn-ghost gap-1.5 text-xs py-1.5"
                      onClick={() => downloadSlip(s)}
                    >
                      <Icon name="Download" size={13} />
                      PDF
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Offer Letters Tab ────────────────────────────────────────────────────────

function OfferLettersTab({
  offerLetters: initialOffers,
  tenantName,
  currentUserRole,
}: {
  offerLetters: OfferLetterRecord[];
  tenantName: string;
  currentUserRole: string;
}) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ candidate: "", role: "", ctc: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isManager = ["ADMIN", "MANAGER", "SUPER_ADMIN"].includes(currentUserRole);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/hr/offer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidate: form.candidate, role: form.role, ctc: parseFloat(form.ctc) }),
      });
      if (!res.ok) {
        const j = await res.json();
        setError(j.error ?? "Failed");
      } else {
        setCreating(false);
        setForm({ candidate: "", role: "", ctc: "" });
        router.refresh();
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  function downloadOffer(ol: OfferLetterRecord) {
    const doc = new jsPDF();
    const ctc = Number(ol.ctc);

    // Header
    doc.setFillColor(217, 164, 65);
    doc.rect(0, 0, 210, 40, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text(tenantName, 15, 17);
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text("Offer of Employment", 15, 30);

    doc.setTextColor(30, 30, 30);

    // Date
    doc.setFontSize(10);
    doc.text(`Date: ${new Date(ol.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}`, 15, 54);

    // Salutation
    doc.setFontSize(11);
    doc.text(`Dear ${ol.candidate},`, 15, 68);

    // Body
    doc.setFontSize(10);
    const bodyLines = doc.splitTextToSize(
      `We are pleased to offer you the position of ${ol.role} at ${tenantName}. After reviewing your qualifications and experience, we believe you will be a valuable addition to our team.`,
      180
    );
    doc.text(bodyLines, 15, 80);

    // CTC box
    doc.setFillColor(245, 245, 240);
    doc.rect(12, 100, 186, 28, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Compensation Details", 20, 113);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Annual CTC: ${inrFull(ctc)}`, 20, 122);
    doc.text(`Monthly: ${inrFull(Math.round(ctc / 12))}`, 100, 122);

    // Terms
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Terms & Conditions", 15, 142);
    doc.setFont("helvetica", "normal");
    const terms = [
      "1. This offer is contingent upon successful completion of background verification.",
      "2. You will be on probation for the first 3 months.",
      "3. This letter constitutes an offer of employment, not a contract.",
      "4. Please respond by signing and returning a copy within 7 working days.",
    ];
    terms.forEach((t, i) => {
      doc.text(t, 15, 152 + i * 9);
    });

    // Closing
    doc.text("We look forward to welcoming you to our team!", 15, 200);
    doc.setFont("helvetica", "bold");
    doc.text("Warm Regards,", 15, 215);
    doc.text(`HR Department`, 15, 224);
    doc.text(tenantName, 15, 233);

    // Acceptance
    doc.setDrawColor(200, 200, 200);
    doc.line(15, 252, 195, 252);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text("Candidate Acceptance", 15, 260);
    doc.text("I accept the offer: ____________________  Date: ________________", 15, 268);

    doc.save(`Offer-Letter-${ol.candidate.replace(/\s+/g, "-")}-${tenantName}.pdf`);
  }

  const sorted = [...initialOffers].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-semibold text-lg">Offer Letters</h3>
        {isManager && (
          <button className="btn btn-primary gap-2" onClick={() => setCreating(true)}>
            <Icon name="Plus" size={15} />
            Generate Offer
          </button>
        )}
      </div>

      {sorted.length === 0 ? (
        <EmptyState icon="FileText" title="No offer letters" hint="Generate an offer letter using the button above." />
      ) : (
        <div className="space-y-3">
          {sorted.map((ol) => (
            <Card key={ol.id} className="p-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="grid place-items-center w-10 h-10 rounded-xl bg-gold-soft text-gold-bright flex-shrink-0">
                  <Icon name="FileText" size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-[14px]">{ol.candidate}</div>
                  <div className="text-sm text-txt-dim">
                    {ol.role} · CTC: <span className="text-gold-bright font-semibold">{inrFull(Number(ol.ctc))}</span>
                  </div>
                  <div className="text-[11px] text-txt-faint mt-0.5">{timeAgo(ol.createdAt)}</div>
                </div>
                <button
                  className="btn btn-ghost gap-1.5 text-xs py-1.5 flex-shrink-0"
                  onClick={() => downloadOffer(ol)}
                >
                  <Icon name="Download" size={13} />
                  Download Letter
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {creating && (
        <Modal title="Generate Offer Letter" onClose={() => { setCreating(false); setError(""); }}>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="field-label">Candidate Name</label>
              <input
                type="text"
                className="input w-full"
                placeholder="e.g. Priya Sharma"
                required
                value={form.candidate}
                onChange={(e) => setForm((p) => ({ ...p, candidate: e.target.value }))}
              />
            </div>
            <div>
              <label className="field-label">Role / Designation</label>
              <input
                type="text"
                className="input w-full"
                placeholder="e.g. Senior Sales Executive"
                required
                value={form.role}
                onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}
              />
            </div>
            <div>
              <label className="field-label">Annual CTC (₹)</label>
              <input
                type="number"
                className="input w-full"
                placeholder="e.g. 600000"
                required
                min={0}
                value={form.ctc}
                onChange={(e) => setForm((p) => ({ ...p, ctc: e.target.value }))}
              />
              {form.ctc && !isNaN(parseFloat(form.ctc)) && (
                <p className="text-xs text-txt-faint mt-1">{inrFull(parseFloat(form.ctc))} per annum</p>
              )}
            </div>
            {error && <p className="text-red text-sm">{error}</p>}
            <div className="flex gap-3 pt-1">
              <button type="submit" className="btn btn-primary flex-1" disabled={loading}>
                {loading ? "Saving…" : "Create & Save"}
              </button>
              <button type="button" className="btn btn-ghost flex-1" onClick={() => { setCreating(false); setError(""); }}>
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

// ─── Documents Tab ────────────────────────────────────────────────────────────

const DOC_TYPE_ICONS: Record<string, string> = {
  AADHAR: "CreditCard",
  PAN: "CreditCard",
  RESUME: "FileUser",
  CONTRACT: "FileSignature",
  CERTIFICATE: "Award",
  PAYSLIP: "Receipt",
  POLICY: "BookOpen",
  OTHER: "File",
};

function DocumentsTab({
  documents: initialDocs,
  users,
  currentUserId,
}: {
  documents: DocumentRecord[];
  users: StaffUser[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ type: "RESUME", name: "", userId: currentUserId });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/hr/document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const j = await res.json();
        setError(j.error ?? "Failed");
      } else {
        setAdding(false);
        setForm({ type: "RESUME", name: "", userId: currentUserId });
        router.refresh();
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  // Group by type
  const groups: Record<string, DocumentRecord[]> = {};
  for (const d of initialDocs) {
    if (!groups[d.type]) groups[d.type] = [];
    groups[d.type].push(d);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-semibold text-lg">Document Vault</h3>
        <button className="btn btn-primary gap-2" onClick={() => setAdding(true)}>
          <Icon name="Upload" size={15} />
          Add Document
        </button>
      </div>

      {initialDocs.length === 0 ? (
        <EmptyState icon="FolderOpen" title="No documents" hint="Upload employee documents to the vault." />
      ) : (
        <div className="space-y-5">
          {Object.entries(groups).map(([type, docs]) => (
            <div key={type}>
              <div className="section-label mb-2">{type}</div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {docs.map((doc) => (
                  <Card key={doc.id} className="p-4 flex items-start gap-3">
                    <div className="grid place-items-center w-9 h-9 rounded-xl bg-panel-2 text-txt-dim flex-shrink-0">
                      <Icon name={DOC_TYPE_ICONS[doc.type] ?? "File"} size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-[13px] leading-tight truncate">{doc.name}</div>
                      <div className="text-[11px] text-txt-faint mt-0.5">
                        {doc.user?.name ?? "–"} · {timeAgo(doc.createdAt)}
                      </div>
                    </div>
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-txt-faint hover:text-gold-bright transition-colors flex-shrink-0"
                      title="View"
                    >
                      <Icon name="ExternalLink" size={14} />
                    </a>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {adding && (
        <Modal title="Add Document" onClose={() => { setAdding(false); setError(""); }}>
          <form onSubmit={handleAdd} className="space-y-4">
            <div>
              <label className="field-label">Document Type</label>
              <select
                className="input w-full"
                value={form.type}
                onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}
              >
                <option value="AADHAR">Aadhaar Card</option>
                <option value="PAN">PAN Card</option>
                <option value="RESUME">Resume / CV</option>
                <option value="CONTRACT">Employment Contract</option>
                <option value="CERTIFICATE">Certificate</option>
                <option value="PAYSLIP">Pay Slip</option>
                <option value="POLICY">Policy Document</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div>
              <label className="field-label">Document Name</label>
              <input
                type="text"
                className="input w-full"
                placeholder="e.g. Rahul Sharma - Aadhaar"
                required
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              />
            </div>
            <div>
              <label className="field-label">Employee</label>
              <select
                className="input w-full"
                value={form.userId}
                onChange={(e) => setForm((p) => ({ ...p, userId: e.target.value }))}
              >
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
            <p className="text-xs text-txt-faint">
              Note: This saves document metadata. In production, connect file storage in Settings → Integrations.
            </p>
            {error && <p className="text-red text-sm">{error}</p>}
            <div className="flex gap-3 pt-1">
              <button type="submit" className="btn btn-primary flex-1" disabled={loading}>
                {loading ? "Saving…" : "Add Document"}
              </button>
              <button type="button" className="btn btn-ghost flex-1" onClick={() => { setAdding(false); setError(""); }}>
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

// ─── Tasks Tab (localStorage) ─────────────────────────────────────────────────

const TASK_COLS: { key: TaskStatus; label: string; color: string; icon: string }[] = [
  { key: "todo", label: "To-Do", color: "text-txt-dim", icon: "Circle" },
  { key: "doing", label: "Doing", color: "text-blue", icon: "PlayCircle" },
  { key: "done", label: "Done", color: "text-green", icon: "CheckCircle2" },
];

function TasksTab({ tenantId }: { tenantId?: string }) {
  const STORAGE_KEY = `hr_tasks_${tenantId ?? "default"}`;
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setTasks(JSON.parse(raw));
    } catch {
      // ignore
    }
    setHydrated(true);
  }, [STORAGE_KEY]);

  const saveTasks = useCallback(
    (next: Task[]) => {
      setTasks(next);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
    },
    [STORAGE_KEY]
  );

  function addTask() {
    if (!newTitle.trim()) return;
    const next: Task = {
      id: Math.random().toString(36).slice(2),
      title: newTitle.trim(),
      status: "todo",
      createdAt: Date.now(),
    };
    saveTasks([...tasks, next]);
    setNewTitle("");
  }

  function moveTask(id: string, status: TaskStatus) {
    saveTasks(tasks.map((t) => (t.id === id ? { ...t, status } : t)));
  }

  function deleteTask(id: string) {
    saveTasks(tasks.filter((t) => t.id !== id));
  }

  if (!hydrated) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="skeleton h-10 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-display font-semibold text-lg">Personal Tasks</h3>
        <span className="tag bg-gold-soft text-gold-bright text-[10px]">Stored locally · per-device</span>
      </div>
      <p className="text-txt-faint text-xs mb-4">
        Personal task board. Data is saved in your browser's localStorage, not on the server.
      </p>

      {/* Add Task */}
      <div className="flex gap-2 mb-6">
        <input
          type="text"
          className="input flex-1"
          placeholder="Add a new task…"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addTask()}
        />
        <button className="btn btn-primary gap-1.5" onClick={addTask} disabled={!newTitle.trim()}>
          <Icon name="Plus" size={15} />
          Add
        </button>
      </div>

      {/* Columns */}
      <div className="grid sm:grid-cols-3 gap-4">
        {TASK_COLS.map((col) => {
          const colTasks = tasks
            .filter((t) => t.status === col.key)
            .sort((a, b) => b.createdAt - a.createdAt);
          return (
            <div key={col.key}>
              <div className={`flex items-center gap-2 mb-3 font-semibold text-sm ${col.color}`}>
                <Icon name={col.icon} size={15} />
                {col.label}
                <span className="ml-auto bg-panel-2 text-txt-faint text-[11px] font-normal rounded-full px-2 py-0.5">
                  {colTasks.length}
                </span>
              </div>
              <div className="space-y-2 min-h-[120px]">
                {colTasks.length === 0 && (
                  <div className="rounded-[12px] border border-dashed border-line h-20 flex items-center justify-center text-txt-faint text-xs">
                    No tasks
                  </div>
                )}
                {colTasks.map((t) => (
                  <Card key={t.id} className="p-3">
                    <div className="flex items-start gap-2">
                      <div className="flex-1 text-[13px] leading-snug">{t.title}</div>
                      <button
                        className="text-txt-faint hover:text-red transition-colors flex-shrink-0"
                        onClick={() => deleteTask(t.id)}
                        title="Delete"
                      >
                        <Icon name="Trash2" size={13} />
                      </button>
                    </div>
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {TASK_COLS.filter((c) => c.key !== col.key).map((c) => (
                        <button
                          key={c.key}
                          className={`tag text-[10px] cursor-pointer hover:opacity-80 transition-opacity ${c.color} bg-panel-2`}
                          onClick={() => moveTask(t.id, c.key)}
                        >
                          Move → {c.label}
                        </button>
                      ))}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Client Component ────────────────────────────────────────────────────

export function HRClient({
  users,
  attendance,
  leaves,
  salarySlips,
  offerLetters,
  documents,
  currentUserRole,
  currentUserId,
  tenantName,
}: HRClientProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("attendance");

  return (
    <div>
      {/* Tab Bar */}
      <div className="flex gap-1 flex-wrap border-b border-line mb-6 pb-1">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
              activeTab === tab.key
                ? "bg-gold-soft text-gold-bright"
                : "text-txt-dim hover:text-txt hover:bg-panel-2"
            }`}
          >
            <Icon name={tab.icon} size={15} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === "attendance" && (
          <AttendanceTab
            users={users}
            attendance={attendance}
            currentUserRole={currentUserRole}
            currentUserId={currentUserId}
          />
        )}
        {activeTab === "leave" && (
          <LeaveTab
            leaves={leaves}
            currentUserRole={currentUserRole}
            currentUserId={currentUserId}
          />
        )}
        {activeTab === "salary" && (
          <SalaryTab salarySlips={salarySlips} tenantName={tenantName} />
        )}
        {activeTab === "offers" && (
          <OfferLettersTab
            offerLetters={offerLetters}
            tenantName={tenantName}
            currentUserRole={currentUserRole}
          />
        )}
        {activeTab === "documents" && (
          <DocumentsTab
            documents={documents}
            users={users}
            currentUserId={currentUserId}
          />
        )}
        {activeTab === "tasks" && <TasksTab tenantId={currentUserId} />}
      </div>
    </div>
  );
}
