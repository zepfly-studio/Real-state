import { requireUser, resolveTenantId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { KPICard, PageHeader } from "@/components/ui";
import { HRClient } from "./client";

export default async function HRPage() {
  const user = await requireUser();
  const tenantId = await resolveTenantId(user);

  if (!tenantId) {
    return <div className="text-txt-dim py-16 text-center">No tenant context.</div>;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const since14 = new Date();
  since14.setDate(since14.getDate() - 14);
  since14.setHours(0, 0, 0, 0);

  const [users, attendance, leaves, salarySlips, offerLetters, documents] =
    await Promise.all([
      prisma.user.findMany({
        where: { tenantId, isActive: true, role: { notIn: ["CLIENT", "CHANNEL_PARTNER"] } },
        orderBy: { name: "asc" },
        select: { id: true, name: true, email: true, role: true, avatarColor: true },
      }),
      prisma.attendance.findMany({
        where: { tenantId, date: { gte: since14 } },
        include: { user: { select: { id: true, name: true } } },
        orderBy: { date: "desc" },
      }),
      prisma.leave.findMany({
        where: { tenantId },
        include: { user: { select: { id: true, name: true, avatarColor: true } } },
        orderBy: { from: "desc" },
      }),
      prisma.salarySlip.findMany({
        where: { tenantId },
        include: { user: { select: { id: true, name: true } } },
        orderBy: { month: "desc" },
      }),
      prisma.offerLetter.findMany({
        where: { tenantId },
        orderBy: { createdAt: "desc" },
      }),
      prisma.document.findMany({
        where: { tenantId },
        include: { user: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
      }),
    ]);

  // ── KPIs ──
  const presentToday = attendance.filter(
    (a) => {
      const d = new Date(a.date);
      d.setHours(0, 0, 0, 0);
      return d.getTime() === today.getTime() && a.status === "PRESENT";
    }
  ).length;

  const wfhToday = attendance.filter(
    (a) => {
      const d = new Date(a.date);
      d.setHours(0, 0, 0, 0);
      return d.getTime() === today.getTime() && a.status === "WFH";
    }
  ).length;

  const onLeaveToday = leaves.filter((l) => {
    const from = new Date(l.from);
    from.setHours(0, 0, 0, 0);
    const to = new Date(l.to);
    to.setHours(23, 59, 59, 999);
    return l.status === "APPROVED" && from <= today && to >= today;
  }).length;

  const pendingLeaves = leaves.filter((l) => l.status === "PENDING").length;
  const headcount = users.length;

  // Serialize Decimal fields so they're safe to pass to client
  const serializedSlips = salarySlips.map((s) => ({
    ...s,
    gross: Number(s.gross),
    deductions: Number(s.deductions),
    net: Number(s.net),
  }));

  const serializedOffers = offerLetters.map((o) => ({
    ...o,
    ctc: Number(o.ctc),
    createdAt: o.createdAt.toISOString(),
  }));

  const serializedAttendance = attendance.map((a) => ({
    ...a,
    date: a.date.toISOString(),
  }));

  const serializedLeaves = leaves.map((l) => ({
    ...l,
    from: l.from.toISOString(),
    to: l.to.toISOString(),
  }));

  const serializedDocs = documents.map((d) => ({
    ...d,
    createdAt: d.createdAt.toISOString(),
  }));

  // Resolve tenant name
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { name: true },
  });
  const tenantName = tenant?.name ?? "Shubh Realtors";

  return (
    <div>
      <PageHeader
        title="People & HR"
        subtitle="Attendance, leaves, salary, documents and offer letters — all in one place."
        icon="Users"
        actions={null}
      />

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPICard
          label="Present Today"
          value={String(presentToday + wfhToday)}
          icon="UserCheck"
          accent="green"
          delta={`+${wfhToday} WFH`}
        />
        <KPICard
          label="On Leave Today"
          value={String(onLeaveToday)}
          icon="CalendarOff"
          accent="red"
        />
        <KPICard
          label="Pending Requests"
          value={String(pendingLeaves)}
          icon="Clock"
          accent="gold"
        />
        <KPICard
          label="Headcount"
          value={String(headcount)}
          icon="Users"
          accent="blue"
        />
      </div>

      {/* Tabbed Client UI */}
      <HRClient
        users={users}
        attendance={serializedAttendance}
        leaves={serializedLeaves}
        salarySlips={serializedSlips}
        offerLetters={serializedOffers}
        documents={serializedDocs}
        currentUserRole={user.role}
        currentUserId={user.id}
        tenantName={tenantName}
      />
    </div>
  );
}
