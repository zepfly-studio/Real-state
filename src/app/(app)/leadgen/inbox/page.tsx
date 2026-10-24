import { PageHeader } from "@/components/ui";
import { requireModule } from "@/lib/leadgen/guard";
import { listThreads } from "@/lib/leadgen/queries";
import { InboxClient } from "@/components/leadgen/InboxClient";
import { AutoRefresh } from "@/components/leadgen/kit";

export const dynamic = "force-dynamic";

export default async function LeadgenInbox({ searchParams }: { searchParams: { channel?: string; view?: string } }) {
  const { tenantId } = await requireModule("leadgen-inbox");
  const threads = await listThreads(tenantId);
  const channel = searchParams.channel === "email" || searchParams.channel === "whatsapp" ? searchParams.channel : "";
  return (
    <div>
      <AutoRefresh seconds={15} />
      <PageHeader title="Reply Inbox" subtitle="Every reply from every channel, in one place. Answer WhatsApp and email without leaving." icon="MessagesSquare" />
      <InboxClient threads={threads} initialChannel={channel} initialAwaiting={searchParams.view === "awaiting"} />
    </div>
  );
}
