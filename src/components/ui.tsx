"use client";
import { ReactNode } from "react";
import { Icon } from "./Icon";

export function Card({
  children,
  className = "",
  kpi = false,
}: {
  children: ReactNode;
  className?: string;
  kpi?: boolean;
}) {
  return (
    <div className={`card ${kpi ? "card-kpi" : ""} ${className}`}>{children}</div>
  );
}

export function PageHeader({
  title,
  subtitle,
  icon,
  actions,
}: {
  title: string;
  subtitle?: string;
  icon?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start gap-4 mb-6">
      <div className="flex items-center gap-3">
        {icon && (
          <div className="grid place-items-center w-11 h-11 rounded-xl bg-gold-soft text-gold-bright">
            <Icon name={icon} size={20} />
          </div>
        )}
        <div>
          <h2 className="font-display text-2xl font-bold leading-tight">{title}</h2>
          {subtitle && <p className="text-txt-dim text-sm mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="ml-auto flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function KPICard({
  label,
  value,
  delta,
  icon,
  accent = "gold",
}: {
  label: string;
  value: string;
  delta?: string;
  icon: string;
  accent?: "gold" | "green" | "blue" | "purple" | "red";
}) {
  const colorMap: Record<string, string> = {
    gold: "text-gold-bright",
    green: "text-green",
    blue: "text-blue",
    purple: "text-purple",
    red: "text-red",
  };
  const up = delta?.startsWith("+");
  return (
    <Card kpi className="p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[12px] font-semibold text-txt-dim uppercase tracking-wide">
          {label}
        </span>
        <span className={`${colorMap[accent]}`}>
          <Icon name={icon} size={18} />
        </span>
      </div>
      <div className="font-display text-[28px] font-bold leading-none">{value}</div>
      {delta && (
        <div className={`text-xs mt-2 font-semibold ${up ? "text-green" : "text-red"}`}>
          {delta} <span className="text-txt-faint font-normal">vs last month</span>
        </div>
      )}
    </Card>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "gold" | "green" | "blue" | "purple" | "red";
}) {
  const map: Record<string, string> = {
    neutral: "bg-panel-2 text-txt-dim",
    gold: "bg-gold-soft text-gold-bright",
    green: "bg-[rgba(62,199,141,.14)] text-green",
    blue: "bg-[rgba(91,141,239,.14)] text-blue",
    purple: "bg-[rgba(155,126,240,.14)] text-purple",
    red: "bg-[rgba(240,85,106,.14)] text-red",
  };
  return (
    <span className={`tag ${map[tone]}`}>{children}</span>
  );
}

export function EmptyState({
  icon = "Inbox",
  title,
  hint,
  action,
}: {
  icon?: string;
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      <div className="grid place-items-center w-14 h-14 rounded-2xl bg-panel-2 text-txt-faint mb-4">
        <Icon name={icon} size={24} />
      </div>
      <div className="font-display font-semibold text-lg">{title}</div>
      {hint && <p className="text-txt-dim text-sm mt-1 max-w-sm">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ConnectBanner({ name, enables }: { name: string; enables: string }) {
  return (
    <div className="card p-4 flex items-center gap-3 border-dashed mb-5">
      <div className="grid place-items-center w-9 h-9 rounded-lg bg-gold-soft text-gold-bright">
        <Icon name="Plug" size={17} />
      </div>
      <div className="text-sm flex-1">
        <span className="font-semibold">Demo mode.</span>{" "}
        <span className="text-txt-dim">{enables} Connect {name} in </span>
        <a href="/settings" className="text-gold-bright font-semibold">Settings → Integrations</a>
        <span className="text-txt-dim"> to go live.</span>
      </div>
    </div>
  );
}

export function StatTile({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="card p-4">
      <div className="text-[11px] uppercase tracking-wide text-txt-faint font-semibold mb-1">
        {label}
      </div>
      <div className={`font-display text-xl font-bold ${tone ?? ""}`}>{value}</div>
    </div>
  );
}
