import { PageHeader } from "@/components/ui";
import { requireModule } from "@/lib/leadgen/guard";
import { SetupClient } from "@/components/leadgen/SetupClient";

export const dynamic = "force-dynamic";

export default async function LeadgenSetup() {
  await requireModule("leadgen-setup");
  return (
    <div>
      <PageHeader title="Setup & Connect" subtitle="Connect each tool once. After that, everything it produces appears in this CRM — nobody needs those tools' own logins." icon="PlugZap" />
      <SetupClient />
    </div>
  );
}
