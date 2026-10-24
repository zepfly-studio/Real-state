"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";
import { Icon } from "@/components/Icon";
import { ToastProvider } from "./kit";

export interface Tab {
  key: string;
  label: string;
  href: string;
  icon: string;
}

/** Wraps every Lead Generation page: sub-navigation and toasts. (The assistant is mounted CRM-wide.) */
export function Shell({ tabs, children }: { tabs: Tab[]; children: ReactNode }) {
  const pathname = usePathname();
  const active = (href: string) => pathname === href || pathname.startsWith(href + "/");
  return (
    <ToastProvider>
        <nav aria-label="Lead Generation sections" className="mb-6 -mt-1 flex gap-1 overflow-x-auto border-b border-line">
          {tabs.map((t) => (
            <Link
              key={t.key}
              href={t.href}
              aria-current={active(t.href) ? "page" : undefined}
              className={`relative flex shrink-0 items-center gap-2 px-3.5 py-2.5 text-[13.5px] font-semibold transition-colors ${
                active(t.href) ? "text-gold-bright" : "text-txt-dim hover:text-txt"
              }`}
            >
              <Icon name={t.icon} size={15} />
              {t.label}
              {active(t.href) && <span className="absolute inset-x-2 -bottom-px h-[2px] rounded-full bg-gold" />}
            </Link>
          ))}
        </nav>
        {children}
    </ToastProvider>
  );
}
