import { PageHeader } from "@/components/ui";
import { requireModule } from "@/lib/leadgen/guard";
import { EmailCampaignsClient } from "@/components/leadgen/EmailCampaignsClient";

export const dynamic = "force-dynamic";

export default async function LeadgenEmail({ searchParams }: { searchParams: { status?: string; new?: string } }) {
  await requireModule("leadgen-email");
  const status = ["ACTIVE", "PAUSED", "DRAFTED", "STOPPED"].includes(searchParams.status ?? "") ? (searchParams.status as string) : "";
  return (
    <div>
      <PageHeader title="Email Campaigns" subtitle="Your Smartlead campaigns and their results — create, start, pause and edit them without leaving the CRM." icon="MailPlus" />
      <EmailCampaignsClient initialStatus={status} openNew={searchParams.new === "1"} />
    </div>
  );
}
