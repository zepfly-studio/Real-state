import { requireUser } from "@/lib/session";
import { visibleModules } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { AppFrame } from "@/components/AppFrame";
import { GlobalAssistant } from "@/components/leadgen/GlobalAssistant";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const modules = await visibleModules(user.role, user.tenantId);

  let brand = {
    name: "Real Estate OS",
    subtitle: "Creative Sharks",
    logoUrl: null as string | null,
    color: "#d9a441",
  };

  if (user.tenantId) {
    const t = await prisma.tenant.findUnique({ where: { id: user.tenantId } });
    if (t) {
      brand = {
        name: t.name,
        subtitle: "Creative Sharks",
        logoUrl: t.logoUrl,
        color: t.brandPrimary || "#d9a441",
      };
    }
  }

  // CRM-wide voice assistant for staff (Lead Generation add-on). Outside AppFrame's page area so it persists across pages.
  const staff = ["SUPER_ADMIN", "ADMIN", "MANAGER", "EMPLOYEE"].includes(user.role);

  return (
    <>
      <AppFrame modules={modules} brand={brand}>
        {children}
      </AppFrame>
      {staff && <GlobalAssistant />}
    </>
  );
}
