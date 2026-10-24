import { PageHeader } from "@/components/ui";
import { requireModule } from "@/lib/leadgen/guard";
import { MailboxesClient } from "@/components/leadgen/MailboxesClient";

export const dynamic = "force-dynamic";

export default async function LeadgenMailboxes() {
  await requireModule("leadgen-mailboxes");
  return (
    <div>
      <PageHeader title="Mailboxes" subtitle="The sending accounts behind your email campaigns, and how healthy they are." icon="Inbox" />
      <MailboxesClient />
    </div>
  );
}
