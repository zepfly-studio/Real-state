"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Icon } from "./Icon";
import { MODULE_GROUPS, type ModuleDef, type ModuleGroup } from "@/lib/modules";
import { Menu, X } from "lucide-react";

export function Sidebar({
  modules,
  brand,
}: {
  modules: ModuleDef[];
  brand: { name: string; subtitle: string; logoUrl?: string | null; color: string };
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const grouped = MODULE_GROUPS.map((g) => ({
    group: g as ModuleGroup,
    items: modules.filter((m) => m.group === g),
  })).filter((x) => x.items.length > 0);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  return (
    <>
      {/* Mobile toggle */}
      <button
        className="fixed top-3 left-3 z-50 md:hidden btn-ghost p-2 rounded-lg bg-panel border border-line"
        onClick={() => setOpen((o) => !o)}
        aria-label="Toggle navigation"
      >
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>

      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={`fixed md:sticky top-0 z-40 h-screen w-[248px] shrink-0 flex flex-col
          bg-[var(--bg-2)] border-r border-line transition-transform
          ${open ? "translate-x-0" : "-translate-x-full"} md:translate-x-0`}
      >
        {/* Brand */}
        <div className="flex items-center gap-3 px-5 h-16 border-b border-line-soft">
          <div
            className="grid place-items-center w-9 h-9 rounded-[10px] font-display font-extrabold text-[#1a1205]"
            style={{ background: `linear-gradient(180deg, var(--gold-bright), ${brand.color})` }}
          >
            {brand.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={brand.logoUrl} alt="" className="w-full h-full object-cover rounded-[10px]" />
            ) : (
              brand.name.charAt(0) || "R"
            )}
          </div>
          <div className="min-w-0">
            <div className="font-display font-bold text-sm leading-tight truncate">
              {brand.name}
            </div>
            <div className="text-[11px] text-txt-faint truncate">{brand.subtitle}</div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {grouped.map(({ group, items }) => (
            <div key={group}>
              <div className="section-label px-2 mb-2">{group}</div>
              <div className="space-y-0.5">
                {items.map((m) => {
                  const active = isActive(m.href);
                  return (
                    <Link
                      key={m.key}
                      href={m.href}
                      onClick={() => setOpen(false)}
                      className={`relative flex items-center gap-3 px-3 py-2 rounded-[10px] text-[13.5px] font-medium transition-colors
                        ${
                          active
                            ? "bg-gold-soft text-gold-bright"
                            : "text-txt-dim hover:text-txt hover:bg-panel"
                        }`}
                    >
                      {active && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-full bg-gold" />
                      )}
                      <Icon name={m.icon} size={17} />
                      <span className="truncate">{m.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="px-5 py-3 border-t border-line-soft text-[11px] text-txt-faint">
          Real Estate OS · v1.0
        </div>
      </aside>
    </>
  );
}
