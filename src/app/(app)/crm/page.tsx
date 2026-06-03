import { requireUser, resolveTenantId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import { inr } from "@/lib/format";
import { Icon } from "@/components/Icon";
import KanbanBoard from "./board";
import AddLeadButton from "./AddLeadButton";
import CsvImportButton from "./CsvImportButton";

export default async function CrmPage() {
  const user = await requireUser();
  const tenantId = await resolveTenantId(user);

  if (!tenantId) {
    return <div className="text-txt-dim p-6">No tenant context.</div>;
  }

  const [leads, users] = await Promise.all([
    prisma.lead.findMany({
      where: { tenantId },
      include: { assignedTo: { select: { id: true, name: true, avatarColor: true } } },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.user.findMany({
      where: { tenantId, isActive: true },
      select: { id: true, name: true, avatarColor: true, role: true },
      orderBy: { name: "asc" },
    }),
  ]);

  // KPI calculations
  const totalLeads = leads.length;
  const hotLeads = leads.filter((l) => l.temperature === "HOT").length;
  const activeLeads = leads.filter(
    (l) => !["CLOSED_WON", "CLOSED_LOST"].includes(l.stage)
  );
  const pipelineValue = activeLeads.reduce((s, l) => s + Number(l.value), 0);
  const wonLeads = leads.filter((l) => l.stage === "CLOSED_WON").length;
  const conversionPct = totalLeads > 0 ? (wonLeads / totalLeads) * 100 : 0;

  // Serialise for client (Decimal → number, Date → string)
  const serialisedLeads = leads.map((l) => ({
    ...l,
    value: Number(l.value),
    createdAt: l.createdAt.toISOString(),
    updatedAt: l.updatedAt.toISOString(),
    nextFollowUp: l.nextFollowUp?.toISOString() ?? null,
  }));

  return (
    <div>
      <PageHeader
        title="Sales & Support CRM"
        icon="Users"
        subtitle={`${totalLeads} leads · ${users.length} team members`}
        actions={
          <div className="flex items-center gap-2">
            <CsvImportButton users={users} />
            <ExportCsvButton />
            <AddLeadButton users={users} />
          </div>
        }
      />

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiTile
          label="Total Leads"
          value={String(totalLeads)}
          icon="Users"
          accent="text-blue"
        />
        <KpiTile
          label="Hot Leads"
          value={String(hotLeads)}
          icon="Flame"
          accent="text-red"
        />
        <KpiTile
          label="Pipeline Value"
          value={inr(pipelineValue)}
          icon="IndianRupee"
          accent="text-gold-bright"
        />
        <KpiTile
          label="Conversion"
          value={`${conversionPct.toFixed(1)}%`}
          icon="TrendingUp"
          accent="text-green"
        />
      </div>

      {/* Kanban Board */}
      <KanbanBoard leads={serialisedLeads} users={users} />
    </div>
  );
}

function KpiTile({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: string;
  icon: string;
  accent: string;
}) {
  return (
    <div className="card card-kpi p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[12px] font-semibold text-txt-dim uppercase tracking-wide">
          {label}
        </span>
        <span className={accent}>
          <Icon name={icon} size={18} />
        </span>
      </div>
      <div className="font-display text-[28px] font-bold leading-none">{value}</div>
    </div>
  );
}

// Small export button — purely client-side download trigger
function ExportCsvButton() {
  return (
    <a
      href="/api/leads/export"
      download
      className="btn btn-ghost flex items-center gap-2 text-sm"
    >
      <Icon name="Download" size={15} />
      Export CSV
    </a>
  );
}
