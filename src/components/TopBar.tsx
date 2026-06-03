"use client";
import { useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { Bell, Search, ChevronDown, LogOut, RefreshCw, Sun, Moon } from "lucide-react";
import { Role } from "@prisma/client";
import { initials } from "@/lib/format";
import { useTheme } from "./ThemeProvider";

const ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  MANAGER: "Manager",
  EMPLOYEE: "Employee",
  CLIENT: "Client",
  CHANNEL_PARTNER: "Channel Partner",
};

const DEMO_ROLES: Role[] = [
  "SUPER_ADMIN",
  "ADMIN",
  "MANAGER",
  "EMPLOYEE",
  "CLIENT",
  "CHANNEL_PARTNER",
];

export function TopBar({ title }: { title: string }) {
  const { data: session, update } = useSession();
  const { theme, toggle } = useTheme();
  const [menu, setMenu] = useState(false);
  const user = session?.user;
  const color = (user as any)?.avatarColor ?? "#d9a441";

  return (
    <header className="sticky top-0 z-20 h-16 flex items-center gap-4 px-5 md:px-7 border-b border-line bg-[var(--bg)]/85 backdrop-blur">
      <h1 className="font-display font-bold text-lg md:text-xl pl-10 md:pl-0 truncate">
        {title}
      </h1>

      <div className="ml-auto flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-2 px-3 h-9 rounded-[10px] bg-bg-2 border border-line w-56">
          <Search size={15} className="text-txt-faint" />
          <input
            placeholder="Search…"
            className="bg-transparent outline-none text-sm w-full placeholder:text-txt-faint"
          />
        </div>

        <button
          onClick={toggle}
          aria-label="Toggle theme"
          title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
          className="grid place-items-center w-9 h-9 rounded-[10px] bg-bg-2 border border-line hover:border-gold transition-colors text-txt-dim"
        >
          {theme === "light" ? <Moon size={17} /> : <Sun size={17} />}
        </button>

        <button className="relative grid place-items-center w-9 h-9 rounded-[10px] bg-bg-2 border border-line hover:border-gold transition-colors">
          <Bell size={17} className="text-txt-dim" />
          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red" />
        </button>

        <div className="relative">
          <button
            onClick={() => setMenu((m) => !m)}
            className="flex items-center gap-2 pl-1 pr-2 h-9 rounded-[10px] bg-bg-2 border border-line hover:border-gold transition-colors"
          >
            <span
              className="grid place-items-center w-7 h-7 rounded-full text-[11px] font-bold text-[#1a1205]"
              style={{ background: color }}
            >
              {initials(user?.name ?? "U")}
            </span>
            <div className="hidden sm:block text-left leading-tight">
              <div className="text-[12.5px] font-semibold">{user?.name}</div>
              <div className="text-[10.5px] text-txt-faint">
                {ROLE_LABEL[(user as any)?.role] ?? ""}
              </div>
            </div>
            <ChevronDown size={14} className="text-txt-faint" />
          </button>

          {menu && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setMenu(false)} />
              <div className="absolute right-0 mt-2 w-60 card p-2 z-40 shadow-2xl animate-fade-in">
                <div className="px-3 py-2 border-b border-line-soft mb-1">
                  <div className="text-sm font-semibold">{user?.name}</div>
                  <div className="text-[11px] text-txt-faint">{user?.email}</div>
                </div>
                <div className="px-3 py-1.5 text-[10.5px] section-label flex items-center gap-1.5">
                  <RefreshCw size={11} /> Switch role (demo)
                </div>
                <div className="grid grid-cols-2 gap-1 px-2 pb-2">
                  {DEMO_ROLES.map((r) => (
                    <button
                      key={r}
                      onClick={async () => {
                        await update({ role: r });
                        setMenu(false);
                        location.reload();
                      }}
                      className={`text-[11px] px-2 py-1.5 rounded-md border transition-colors ${
                        (user as any)?.role === r
                          ? "border-gold text-gold-bright bg-gold-soft"
                          : "border-line text-txt-dim hover:text-txt hover:border-gold"
                      }`}
                    >
                      {ROLE_LABEL[r]}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-red hover:bg-panel-2 border-t border-line-soft mt-1"
                >
                  <LogOut size={15} /> Log out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
