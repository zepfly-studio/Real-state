import { PageHeader } from "@/components/ui";
import { requireModule } from "@/lib/leadgen/guard";
import { listLeads, listThreads } from "@/lib/leadgen/queries";
import { LG_STAGES } from "@/lib/leadgen/stages";
import { LeadsClient } from "@/components/leadgen/LeadsClient";
import { AutoRefresh } from "@/components/leadgen/kit";

export const dynamic = "force-dynamic";

export default async function LeadgenLeads({ searchParams }: { searchParams: { stage?: string } }) {
  const { tenantId } = await requireModule("leadgen-leads");
  const [leads, threads] = await Promise.all([listLeads(tenantId), listThreads(tenantId)]);
  const stage = (LG_STAGES as readonly string[]).includes(searchParams.stage ?? "") ? (searchParams.stage as string) : "";
  return (
    <div>
      <AutoRefresh seconds={20} />
      <PageHeader title="Prospects" subtitle="Everyone the campaigns found, and where they are. Click a prospect to see their chat and move them forward." icon="UserSearch" />
      <LeadsClient leads={leads} threads={threads} initialStage={stage} />
    </div>
  );
}
