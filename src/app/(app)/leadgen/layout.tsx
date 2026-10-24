import { redirect } from "next/navigation";
import { requireUser, resolveTenantId } from "@/lib/session";
import { visibleModules } from "@/lib/permissions";
import { Shell } from "@/components/leadgen/Shell";

export default async function LeadgenLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const tenantId = await resolveTenantId(user);
  const mods = (await visibleModules(user.role, tenantId)).filter((m) => m.key.startsWith("leadgen"));
  if (!mods.some((m) => m.key === "leadgen")) redirect("/dashboard");
  const tabs = mods.map((m) => ({ key: m.key, label: m.label, href: m.href, icon: m.icon }));
  return <Shell tabs={tabs}>{children}</Shell>;
}
