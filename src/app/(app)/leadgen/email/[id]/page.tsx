import Link from "next/link";
import { notFound } from "next/navigation";
import { requireModule } from "@/lib/leadgen/guard";
import { EmailCampaignDetail } from "@/components/leadgen/EmailCampaignDetail";

export const dynamic = "force-dynamic";

export default async function LeadgenEmailCampaign({ params }: { params: { id: string } }) {
  await requireModule("leadgen-email");
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) notFound();
  return (
    <div>
      <Link href="/leadgen/email" className="text-sm font-semibold text-gold-bright inline-flex items-center gap-1 mb-4">← All email campaigns</Link>
      <EmailCampaignDetail id={id} />
    </div>
  );
}
