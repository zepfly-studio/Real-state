import { requireUser, resolveTenantId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { CreativesClient } from "./client";

export default async function CreativesPage() {
  const user = await requireUser();
  const tenantId = await resolveTenantId(user);

  let brandColor = "#d9a441";
  let brandName = "Shubh Realtors";

  if (tenantId) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { brandPrimary: true, name: true },
    });
    if (tenant) {
      brandColor = tenant.brandPrimary || "#d9a441";
      brandName = tenant.name || "Shubh Realtors";
    }
  }

  return <CreativesClient brandColor={brandColor} brandName={brandName} />;
}
