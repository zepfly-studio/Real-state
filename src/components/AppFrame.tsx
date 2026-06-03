"use client";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { moduleByHref, type ModuleDef } from "@/lib/modules";

export function AppFrame({
  modules,
  brand,
  children,
}: {
  modules: ModuleDef[];
  brand: { name: string; subtitle: string; logoUrl?: string | null; color: string };
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const title = moduleByHref(pathname)?.label ?? "Dashboard";

  // Live tenant accent override
  useEffect(() => {
    if (brand.color) {
      document.documentElement.style.setProperty("--gold", brand.color);
    }
  }, [brand.color]);

  return (
    <div className="flex min-h-screen">
      <Sidebar modules={modules} brand={brand} />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar title={title} />
        <main key={pathname} className="flex-1 p-5 md:p-[26px] animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  );
}
